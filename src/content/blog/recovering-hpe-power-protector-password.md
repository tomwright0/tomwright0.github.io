---
author: Tom
pubDatetime: 2026-05-14T12:00:00Z
title: Recovering a Forgotten HPE Power Protector Password
slug: recovering-hpe-power-protector-password
featured: false
draft: false
tags:
  - reverse-engineering
  - security
  - windows
  - sqlite
description: What started as a simple password reset turned into reverse engineering a native binary to discover HPE Power Protector stores passwords with AES encryption, not hashing.
---

A UPS management server became inaccessible after someone changed the WebUI password for HPE Power Protector v1.05 back in 2017, almost 10 years ago, and nobody remembered what they set it to. HPE's community forums confirmed there's no built-in reset. The official answer is to reinstall. That felt excessive, so I went digging with the help of Claude.

## Finding the Database

Power Protector installs to `C:\Program Files (x86)\HPE\PowerProtector\` and keeps all its data in a single file: `mc2.db`. The name and extension suggested SQLite, and `xxd` confirmed it:

```
SQLite format 3
```

Opening it in DB Browser for SQLite (DB4S) showed nothing though. No tables at all. Odd for a file that confirmed as valid SQLite. It turned out that opening `mc2.db` directly via File > Open shows nothing, but using `ATTACH` in the Execute SQL tab works fine. Once attached, a `users` table appeared with two columns: `userID` and `descriptor`.

The `descriptor` column is a large JSON-like blob with the password field right at the start, followed by view config, session state, and everything else.

## Assuming MD5 (Wrong)

The password value looked like this:

```
password:"=<base64 string>"
```

The leading `=` and Base64 encoding looked like a padded MD5 digest. I pulled the value, decoded it to hex, and threw it at hashcat against the rockyou wordlist:

```bash
hashcat -m 0 -a 0 hash.txt rockyou.txt
```

Status: Exhausted. No match across 14 million passwords. Adding `best66.rule` pushed that to nearly a billion candidates and still nothing. Whatever this was, it wasn't a standard hash of a common password.

## What It Actually Is

Rather than keep bruteforcing blind, I needed a copy of the binary to inspect. I remembered I had a Windows 10 IoT LTSC VM sitting on my home Proxmox box, so I figured I could just install Power Protector fresh on that and copy the files back to my Mac. The official HPE download page required an account I didn't have, but a quick search on archive.org turned up an exe installer. Jackpot. I installed it on the VM, then copied `mc2.exe`, the other binaries, and the fresh default database back to my Mac so I could run strings against the executable and also check what the default install's database looks like in DB4S.

Running strings against `mc2.exe`, a couple of things stood out:

```
File.codec(mode, in, [password])
```

```
var global = this; function load(fileName, mode){...} include('scripts/autorun.js', 'AFS');
```

The app has an embedded JavaScript engine and loads scripts from an AFS archive packed inside the executable. The scripts are zlib-compressed so they don't show up as plain strings, but scanning the binary for zlib stream headers and decompressing them pulls out the actual JS source files. One of them was `codecs.js`, which had this:

```javascript
var PWD =
{
  encode: function (password, key) {
    if(!key) key = PWD.key;
    if(password[0] != "=") return "=" + AES.encode(password, key);
    else return password;
  },

  decode: function (password, key) {
    if(!key) key = PWD.key;
    if(password[0] == "=") return AES.decode(password.substr(1), key);
    else return password;
  },

  key: Base64.decode("ZS98L3xDsg=="),
  ...
}
```

Not a hash. The `=` prefix marks the value as AES-128-CBC encrypted ciphertext, and there's a hardcoded application key baked right in. Hashcat came up empty because there was nothing to crack, the whole thing is just reversible encryption.

The `AES` object wraps a native C function:

```javascript
var AES =
{
  encode: function(input, password) { return File.codec(16, File.codec(8, input, password)); },
  decode: function(input, password) { return File.codec(9, File.codec(17, input), password); }
}
```

Mode 8 is AES encrypt, 9 is decrypt, 16/17 are Base64 encode/decode. The actual AES implementation is inside `mc2.exe`, so replicating it externally would mean disassembling the binary to figure out the key derivation and padding. Possible, but not the fastest route.

## Decrypting via the App's Own Engine

The simpler approach is to make the app decrypt it for you. Power Protector has a user scripting system under `configs/scripts/`. Drop a new JS file in there with this content:

```javascript
UserScript =
{
  name: "Decrypt",
  enabled: true,
  interval: 5000,
  action: function()
  {
    try {
      var hash = UserFunctions.fileRead("C:\\temp\\hash.txt").replace(/\s+/g, "");
      var key = File.codec(17, "ZS98L3xDsg==");
      var ct = hash;
      if(ct[0] == "=") ct = ct.substr(1);
      var pw = File.codec(9, File.codec(17, ct), key);
      UserFunctions.fileWrite("C:\\temp\\decrypted.txt", pw);
    } catch(e) {
      UserFunctions.fileWrite("C:\\temp\\error.txt", e.toString());
    }
    UserScript.enabled = false;
  }
}
```

Write the target password value to `C:\temp\hash.txt`, restart the service, wait a few seconds, and the plaintext shows up in `C:\temp\decrypted.txt`. The app does its own decryption.

## A Few Notes

For anyone else who ends up down this path:

Storing passwords with a hardcoded symmetric key inside the binary isn't really better than storing them in plaintext. Anyone with the binary and the database file can decrypt everything. This is an Eaton/HPE design choice, not something configurable.

Password values starting with `=` are AES-encrypted. Values starting with `\x01` are legacy XXTEA-encrypted from older versions. Plain strings are stored as-is. The decoder handles all three.

The DB4S quirk of showing no tables when opening `mc2.db` directly seems to be something specific to how Power Protector creates the database, maybe a page size or format that trips up the normal open path. Using ATTACH in the SQL tab sidesteps it.

Reinstalling isn't always necessary. If you have access to the database and another working install to run scripts against, you can get the password back without losing any UPS configuration.

## Going Further: A Standalone Python Decrypter

The JS userscript works but it's awkward. You need the VM running, the service restarted, and files shuffled in and out. I wanted a self-contained Python script I could run locally. The problem was that every attempt to replicate `File.codec` in Python failed. We knew the app key and guessed AES-128-CBC, but nothing matched. The native C implementation was doing something non-standard with the 7-byte key, and without seeing the actual code there was no way to know what.

I had zero reverse engineering experience, but I'd heard about [GhidraMCP](https://github.com/bethington/ghidra-mcp), a plugin that exposes Ghidra's decompiler over MCP so Claude can directly query and navigate a binary. Worth a try. There was some setup friction getting it connected: the plugin runs on a Unix domain socket locally, which only works with the Claude desktop app, not the web interface. Once that was sorted, Claude used Ghidra MCP to locate the `File.codec` function inside `mc2.exe`, trace the assembly for mode 8, and read out exactly what was happening with the key.

The answer was in how the SHA1 hash of the app key gets split:

- **AES key** = SHA1(app\_key)[0:16]
- **AES IV** = SHA1(app\_key)[4:20]

The IV starts at byte 4, overlapping with the tail of the key region. That's what made every blind guess fail. There's no way to know that without reading the assembly.

With the algorithm confirmed, the Python script is straightforward:

```python
#!/usr/bin/env python3
# pip install pycryptodome
import sys, base64, hashlib
from Crypto.Cipher import AES

APP_KEY = base64.b64decode("ZS98L3xDsg==")

def _key_iv():
    h = hashlib.sha1(APP_KEY).digest()
    return h[0:16], h[4:20]

def decrypt(value):
    key, iv = _key_iv()
    if value.startswith("="):
        value = value[1:]
    ct = base64.b64decode(value)
    return AES.new(key, AES.MODE_CBC, iv).decrypt(ct).rstrip(b"\x00").decode()

def encrypt(plaintext):
    key, iv = _key_iv()
    pt = plaintext.encode().ljust(16, b"\x00")
    ct = AES.new(key, AES.MODE_CBC, iv).encrypt(pt)
    return "=" + base64.b64encode(ct).decode()

if __name__ == "__main__":
    if len(sys.argv) == 3 and sys.argv[1] == "-e":
        print(encrypt(sys.argv[2]))
    elif len(sys.argv) == 2:
        print(decrypt(sys.argv[1]))
    else:
        print(f"Usage: {sys.argv[0]} <hash>")
        print(f"       {sys.argv[0]} -e <plaintext>")
```

```bash
pip install pycryptodome

python3 hpepp_decrypt.py "=GAcKZCPcXjTbQ8NJc3FVnw=="
# admin

python3 hpepp_decrypt.py -e "admin"
# =GAcKZCPcXjTbQ8NJc3FVnw==
```

No RE background needed. Get Ghidra MCP connected, point it at the binary, and let Claude navigate the disassembly. The setup took longer than the actual analysis.
