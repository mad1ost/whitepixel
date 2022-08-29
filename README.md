# whitepixel on WebGL 2

Based on [whitepixel](https://whitepixel.zorinaq.com/). Unlike the original version, it cracks passwords up to 15 characters long, not 8. It also does not use the precomputation of function I. 


## How to try

You can try it here [https://mad1ost.github.io/whitepixel/](https://mad1ost.github.io/whitepixel/)


## How it works

This is how a password with a length of 10 characters (bytes) looks after padding:
```
  w[0]        w[1]        w[2]      ..........    w[14]       w[15]

0xXXXXZZZZ  0xZZZZZZZZ  0xZZZZ8000  ..........  0x80000000  0x00000000

little-endian byte order     | append 0x80     | append passwd lenght
                                               | in bits
```
Each call to the `requestAnimationFrame` function draws `pointsPerDraw` points. Each point gets 4 passwords (after padding) that differ in `ZZ` bytes, and iterates over them in `XX` bytes to get all possible combinations.

Since the maximum password length is limited to 15 characters, it is sufficient to send only the first 4 dwords (`w[0]`, `w[1]`, `w[2]`, `w[3]`), since the remaining dwords (except `w[14]`) will be 0. `w[14]` is sent separately in `pw_len`.

The number of first `XX` bytes (characters) to iterate (`firstCharsCnt`) depends on the selected charset. If the password length is less than or equal to `firstCharsCnt`, then the entire password is considered to consist of `ZZ` bytes.

The charset must consist of a continuous range of ASCII characters, that is, the code of each subsequent character `charCodeAt(N + 1)` must differ from the previous `charCodeAt(N)` by one.

Each `XX` byte by default takes the value of the first character of the charset `charset.firstChar`. After each `innerLoopCnt` cycle, the byte value is incremented by one. If a byte has the value `charset.afterLastChar`, an offset `charsOffset` of the size `256 - charset.size` is added to it, which resets the current byte to `charset.firstChar` and increases the next one by one.

By default, each point is located outside the clip space. If a hash match is found, the result is written to a 1x1 pixel `RGBA32UI` texture. The pixel value is read using `readPixels` (x: `gl_VertexID`; y: number of one of the 4 passwords; z: step number when iterating over `XX` characters; w: 1 (indicating that hash found)). If the hash is not found (w: 0) and not all `ZZ` bytes have been iterated, then the next `pointsPerDraw` points are drawn.


## Some limitations

The number of points per draw `pointsPerDraw` is doubled with each call to the `requestAnimationFrame` function until the difference between calls is greater than `REFRESH_RATE` or the limit in `MAX_POINTS_PER_DRAW` is reached. The default value for `REFRESH_RATE` is 500 ms. The larger the value, the faster the iteration. However, a value that is too high (several seconds or more) can cause the page to freeze. The maximum number of points for drawing `MAX_POINTS_PER_DRAW` is 1048576, which corresponds to 64 MB (each point processes 4 passwords for each of which 4 32-bit dwords are transmitted). Accordingly, if errors like `OUT_OF_MEMORY` occur, then try reducing the value of the `MAX_POINTS_PER_DRAW` parameter. If the frequency of updating statistics is very high, then most likely the video card rests on the `MAX_POINTS_PER_DRAW` limit - try to increase its value. 
