'use strict';

document.addEventListener('DOMContentLoaded', main);

function main() {
	const REFRESH_RATE = 500; // ms
	const MAX_POINTS_PER_DRAW = 1048576; // max buffer size 64M
	const PASSWD_PER_POINT = 4;
	const output = document.getElementById('output');
	const gl = document.createElement('canvas').getContext('webgl2');
	if (!gl) {
		output.innerText = 'Unfortunately WebGL 2 is not available in this browser.';
		return;
	}
	const vs = `#version 300 es

	#define MD5_A 0x67452301u
	#define MD5_B 0xefcdab89u
	#define MD5_C 0x98badcfeu
	#define MD5_D 0x10325476u

	#define F(x, y, z) (((y ^ z) & x) ^ z)
	#define G(x, y, z) ((x & z) | (y & ~z))
	#define H(x, y, z) (x ^ (y ^ z))
	#define I(x, y, z) (y ^ (x | ~z))

	#define ROTATE_LEFT(x, n)  ((x << n) | (x >> (32 - n)))
	#define ROTATE_RIGHT(x, n) ((x >> n) | (x << (32 - n)))

	#define MD5_STEP(f, a, b, c, d, x, t, s) \
	{ \
		a += x; \
		a += t; \
		a += f(b, c, d); \
		a  = ROTATE_LEFT(a, s); \
		a += b; \
	}

	#define MD5_STEP0(f, a, b, c, d, t, s) \
	{ \
		a += t; \
		a += f(b, c, d); \
		a  = ROTATE_LEFT(a, s); \
		a += b; \
	}

	#define MD5_STEP_REV(f, a, b, c, d, x, t, s) \
	{ \
		a -= b; \
		a  = ROTATE_RIGHT(a, s); \
		a -= f(b, c, d); \
		a -= t; \
		a -= x; \
	}

	#define MD5_STEP_REV0(f, a, b, c, d, x, s) \
	{ \
		a -= b; \
		a  = ROTATE_RIGHT(a, s); \
		a -= f(b, c, d); \
		a -= x; \
	}

	uniform uvec4 searched;
	uniform uvec4 after_last_char;
	uniform uvec4 chars_offset;
	uniform uvec2 mask;
	uniform uint pw_len; // in bits
	uniform uint il_cnt;

	in uvec4 words0;
	in uvec4 words1;
	in uvec4 words2;
	in uvec4 words3;

	flat out uvec4 v_color;

	void main ()
	{
		gl_PointSize = 1.;
		gl_Position = vec4(2., 2., 2., 1.); // out of clip space

		uvec4 w0 = words0;
		uvec4 w1 = words1;
		uvec4 w2 = words2;
		uvec4 w3 = words3;

		uint w14 = pw_len;

		uvec4 s_rev = searched - uvec4(MD5_A, MD5_B, MD5_C, MD5_D);
		uvec4 a_rev = uvec4(s_rev.x);
		uvec4 b_rev = uvec4(s_rev.y);
		uvec4 c_rev = uvec4(s_rev.z);
		uvec4 d_rev = uvec4(s_rev.w);

		MD5_STEP_REV0 (I, b_rev, c_rev, d_rev, a_rev,      0xeb86d391u, 21);
		MD5_STEP_REV  (I, c_rev, d_rev, a_rev, b_rev,  w2, 0x2ad7d2bbu, 15);
		MD5_STEP_REV0 (I, d_rev, a_rev, b_rev, c_rev,      0xbd3af235u, 10);
		MD5_STEP_REV0 (I, a_rev, b_rev, c_rev, d_rev,      0xf7537e82u,  6);
		MD5_STEP_REV0 (I, b_rev, c_rev, d_rev, a_rev,      0x4e0811a1u, 21);
		MD5_STEP_REV0 (I, c_rev, d_rev, a_rev, b_rev,      0xa3014314u, 15);
		MD5_STEP_REV0 (I, d_rev, a_rev, b_rev, c_rev,      0xfe2ce6e0u, 10);
		MD5_STEP_REV0 (I, a_rev, b_rev, c_rev, d_rev,      0x6fa87e4fu,  6);
		MD5_STEP_REV  (I, b_rev, c_rev, d_rev, a_rev,  w1, 0x85845dd1u, 21);
		MD5_STEP_REV0 (I, c_rev, d_rev, a_rev, b_rev,      0xffeff47du, 15);
		MD5_STEP_REV  (I, d_rev, a_rev, b_rev, c_rev,  w3, 0x8f0ccc92u, 10);
		MD5_STEP_REV0 (I, a_rev, b_rev, c_rev, d_rev,      0x655b59c3u,  6);
		MD5_STEP_REV0 (I, b_rev, c_rev, d_rev, a_rev,      0xfc93a039u, 21);
		MD5_STEP_REV  (I, c_rev, d_rev, a_rev, b_rev, w14, 0xab9423a7u, 15);
		MD5_STEP_REV0 (I, d_rev, a_rev, b_rev, c_rev,      0x432aff97u, 10);
		MD5_STEP_REV0 (I, a_rev, b_rev, c_rev, d_rev,      0xf4292244u,  6);

		for (uint i = 0u; i < il_cnt; i++) {

			uvec4 pre_a = a_rev - w0;
			uvec4 pre_b = b_rev;
			uvec4 pre_c = c_rev;
			uvec4 pre_d = d_rev;

			uvec4 a = uvec4(MD5_A);
			uvec4 b = uvec4(MD5_B);
			uvec4 c = uvec4(MD5_C);
			uvec4 d = uvec4(MD5_D);

			MD5_STEP  (F, a, b, c, d,  w0, 0xd76aa478u,  7);
			MD5_STEP  (F, d, a, b, c,  w1, 0xe8c7b756u, 12);
			MD5_STEP  (F, c, d, a, b,  w2, 0x242070dbu, 17);
			MD5_STEP  (F, b, c, d, a,  w3, 0xc1bdceeeu, 22);
			MD5_STEP0 (F, a, b, c, d,      0xf57c0fafu,  7);
			MD5_STEP0 (F, d, a, b, c,      0x4787c62au, 12);
			MD5_STEP0 (F, c, d, a, b,      0xa8304613u, 17);
			MD5_STEP0 (F, b, c, d, a,      0xfd469501u, 22);
			MD5_STEP0 (F, a, b, c, d,      0x698098d8u,  7);
			MD5_STEP0 (F, d, a, b, c,      0x8b44f7afu, 12);
			MD5_STEP0 (F, c, d, a, b,      0xffff5bb1u, 17);
			MD5_STEP0 (F, b, c, d, a,      0x895cd7beu, 22);
			MD5_STEP0 (F, a, b, c, d,      0x6b901122u,  7);
			MD5_STEP0 (F, d, a, b, c,      0xfd987193u, 12);
			MD5_STEP  (F, c, d, a, b, w14, 0xa679438eu, 17);
			MD5_STEP0 (F, b, c, d, a,      0x49b40821u, 22);

			MD5_STEP  (G, a, b, c, d,  w1, 0xf61e2562u,  5);
			MD5_STEP0 (G, d, a, b, c,      0xc040b340u,  9);
			MD5_STEP0 (G, c, d, a, b,      0x265e5a51u, 14);
			MD5_STEP  (G, b, c, d, a,  w0, 0xe9b6c7aau, 20);
			MD5_STEP0 (G, a, b, c, d,      0xd62f105du,  5);
			MD5_STEP0 (G, d, a, b, c,      0x02441453u,  9);
			MD5_STEP0 (G, c, d, a, b,      0xd8a1e681u, 14);
			MD5_STEP0 (G, b, c, d, a,      0xe7d3fbc8u, 20);
			MD5_STEP0 (G, a, b, c, d,      0x21e1cde6u,  5);
			MD5_STEP  (G, d, a, b, c, w14, 0xc33707d6u,  9);
			MD5_STEP  (G, c, d, a, b,  w3, 0xf4d50d87u, 14);
			MD5_STEP0 (G, b, c, d, a,      0x455a14edu, 20);
			MD5_STEP0 (G, a, b, c, d,      0xa9e3e905u,  5);
			MD5_STEP  (G, d, a, b, c,  w2, 0xfcefa3f8u,  9);
			MD5_STEP0 (G, c, d, a, b,      0x676f02d9u, 14);
			MD5_STEP0 (G, b, c, d, a,      0x8d2a4c8au, 20);

			MD5_STEP0 (H, a, b, c, d,      0xfffa3942u,  4);
			MD5_STEP0 (H, d, a, b, c,      0x8771f681u, 11);
			MD5_STEP0 (H, c, d, a, b,      0x6d9d6122u, 16);
			MD5_STEP  (H, b, c, d, a, w14, 0xfde5380cu, 23);
			MD5_STEP  (H, a, b, c, d,  w1, 0xa4beea44u,  4);
			MD5_STEP0 (H, d, a, b, c,      0x4bdecfa9u, 11);
			MD5_STEP0 (H, c, d, a, b,      0xf6bb4b60u, 16);
			MD5_STEP0 (H, b, c, d, a,      0xbebfbc70u, 23);
			MD5_STEP0 (H, a, b, c, d,      0x289b7ec6u,  4);
			MD5_STEP  (H, d, a, b, c,  w0, 0xeaa127fau, 11);
			MD5_STEP  (H, c, d, a, b,  w3, 0xd4ef3085u, 16);
			MD5_STEP0 (H, b, c, d, a,      0x04881d05u, 23);
			MD5_STEP0 (H, a, b, c, d,      0xd9d4d039u,  4);

			if (pre_a.x == a.x || pre_a.y == a.y || pre_a.z == a.z || pre_a.w == a.w) {

				MD5_STEP0 (H, d, a, b, c,      0xe6db99e5u, 11);
				MD5_STEP0 (H, c, d, a, b,      0x1fa27cf8u, 16);
				MD5_STEP  (H, b, c, d, a,  w2, 0xc4ac5665u, 23);

				MD5_STEP  (I, a, b, c, d,  w0, 0xf4292244u,  6);
				MD5_STEP0 (I, d, a, b, c,      0x432aff97u, 10);
				MD5_STEP  (I, c, d, a, b, w14, 0xab9423a7u, 15);
				MD5_STEP0 (I, b, c, d, a,      0xfc93a039u, 21);
				MD5_STEP0 (I, a, b, c, d,      0x655b59c3u,  6);
				MD5_STEP  (I, d, a, b, c,  w3, 0x8f0ccc92u, 10);
				MD5_STEP0 (I, c, d, a, b,      0xffeff47du, 15);
				MD5_STEP  (I, b, c, d, a,  w1, 0x85845dd1u, 21);
				MD5_STEP0 (I, a, b, c, d,      0x6fa87e4fu,  6);
				MD5_STEP0 (I, d, a, b, c,      0xfe2ce6e0u, 10);
				MD5_STEP0 (I, c, d, a, b,      0xa3014314u, 15);
				MD5_STEP0 (I, b, c, d, a,      0x4e0811a1u, 21);
				MD5_STEP0 (I, a, b, c, d,      0xf7537e82u,  6);
				MD5_STEP0 (I, d, a, b, c,      0xbd3af235u, 10);
				MD5_STEP  (I, c, d, a, b,  w2, 0x2ad7d2bbu, 15);
				MD5_STEP0 (I, b, c, d, a,      0xeb86d391u, 21);

				if (all(equal(s_rev, uvec4(a.x, b.x, c.x, d.x)))) {
					v_color = uvec4(uint(gl_VertexID), 0u, i, 1u);
					gl_Position = vec4(.0, .0, .0, 1.);
				}
				if (all(equal(s_rev, uvec4(a.y, b.y, c.y, d.y)))) {
					v_color = uvec4(uint(gl_VertexID), 1u, i, 1u);
					gl_Position = vec4(.0, .0, .0, 1.);
				}
				if (all(equal(s_rev, uvec4(a.z, b.z, c.z, d.z)))) {
					v_color = uvec4(uint(gl_VertexID), 2u, i, 1u);
					gl_Position = vec4(.0, .0, .0, 1.);
				}
				if (all(equal(s_rev, uvec4(a.w, b.w, c.w, d.w)))) {
					v_color = uvec4(uint(gl_VertexID), 3u, i, 1u);
					gl_Position = vec4(.0, .0, .0, 1.);
				}
			}
			w0.x += 1u;
			if ((w0.x & 0xffu) == after_last_char.x) { // w0 first char
				w0.x += chars_offset.x;
				if ((w0.x & 0xff00u) == after_last_char.y) { // w0 second char
					w0.x += chars_offset.y;
					if ((w0.x & 0xff0000u) == after_last_char.z) { // w0 third char
						w0.x += chars_offset.z;
					}
				}
			}
			uint first_chars_mask = mask.x;
			uint rest_chars_mask = mask.y;

			uint w0_first_chars = w0.x & first_chars_mask;
			w0 &= rest_chars_mask;
			w0 |= w0_first_chars;
		}
	}
	`;

	const fs = `#version 300 es
		precision highp int;

		flat in uvec4 v_color;
		out uvec4 f_color;

		void main() {
			f_color = v_color;
		}
	`;
	const prog = createProgram(gl, vs, fs);
	if (!prog) return;

	const wordsBuf = gl.createBuffer();

	const w0Loc = gl.getAttribLocation(prog, 'words0');
	const w1Loc = gl.getAttribLocation(prog, 'words1');
	const w2Loc = gl.getAttribLocation(prog, 'words2');
	const w3Loc = gl.getAttribLocation(prog, 'words3');

	const searchedLoc = gl.getUniformLocation(prog, 'searched');
	const afterLastCharLoc = gl.getUniformLocation(prog, 'after_last_char');
	const charsOffsetLoc = gl.getUniformLocation(prog, 'chars_offset');
	const maskLoc = gl.getUniformLocation(prog, 'mask');
	const pwLenLoc = gl.getUniformLocation(prog, 'pw_len');
	const ilCntLoc = gl.getUniformLocation(prog, 'il_cnt');

	// texture 1x1 with 4 values per pixel for storing results
	const texWidth = 1;
	const texHeight = 1;
	const tex = gl.createTexture();
	gl.bindTexture(gl.TEXTURE_2D, tex);
	gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA32UI, texWidth, texHeight);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

	const fb = gl.createFramebuffer();

	let isRunning = false;
	const button = document.getElementById('button');
	button.addEventListener('click', decode);

	function decode() {
		if (isRunning) {
			isRunning = false;
			button.textContent = 'Decode';
			return;
		}
		const hash = document.getElementById('hash').value
			.replace(/\s+/g, '')
			.toLowerCase();
		if (hash === '') {
			output.innerText = 'MD5 hash value is empty.';
			return;
		}
		const re = /^[0-9a-f]{32}$/;
		if (!re.test(hash)) {
			output.innerText = 'MD5 hash value is invalid.';
			return;
		}
		const searched = [];
		for (let i = 0; i < 4; i++) {
			const offset = 8 * i;
			const dword = hash.slice(offset, offset + 8);
			searched[i] = parseInt(dword.match(/../g).reverse().join(''), 16);
		}
		const pwLen = parseInt(document.getElementById('pwlen').value);
		const charsetName = document.getElementById('charset').value;
		const charset = {
			firstChar: 0,
			lastChar: 0,
			afterLastChar: 0,
			size: 0
		}
		let firstCharsCnt = 0;
		switch (charsetName) {
			case 'digit':
				charset.firstChar = '0'.charCodeAt(0);
				charset.lastChar = '9'.charCodeAt(0);
				firstCharsCnt = 4;
				break;
			case 'lower':
				charset.firstChar = 'a'.charCodeAt(0);
				charset.lastChar = 'z'.charCodeAt(0);
				firstCharsCnt = 3;
				break;
			case 'upper':
				charset.firstChar = 'A'.charCodeAt(0);
				charset.lastChar = 'Z'.charCodeAt(0);
				firstCharsCnt = 3;
				break;
			case 'print':
				charset.firstChar = ' '.charCodeAt(0);
				charset.lastChar = '~'.charCodeAt(0);
				firstCharsCnt = 2;
				break;
			default:
				output.innerText = 'Unknown charset.';
				return;
		}
		charset.afterLastChar = charset.lastChar + 1;
		charset.size = charset.afterLastChar - charset.firstChar;

		if (firstCharsCnt >= pwLen) firstCharsCnt = 0;
		const restCharsCnt = pwLen - firstCharsCnt;
		const innerLoopCnt = Math.pow(charset.size, firstCharsCnt);
		const outerLoopCnt = Math.pow(charset.size, restCharsCnt);
		const combsCnt = innerLoopCnt * outerLoopCnt;
		const w0FirstCharsMask = Math.pow(2, 8 * firstCharsCnt) - 1;
		const w0RestCharsMask = 0xffffffff - w0FirstCharsMask;
		// to add to afterLastChar to reset it to firstChar and increase next char by one
		const charsOffset = 256 - charset.size;
		const result = new Uint32Array(texWidth * texHeight * 4);

		//gl.bindTexture(gl.TEXTURE_2D, tex);
		gl.texSubImage2D(
			gl.TEXTURE_2D,
			0,	// mip level
			0,	// x offset
			0,	// y offset
			texWidth,
			texHeight,
			gl.RGBA_INTEGER,
			gl.UNSIGNED_INT,
			result
		);
		gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
		gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0,
			gl.TEXTURE_2D, tex, 0);

		//if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
		//	output.innerText = 'checkFramebufferStatus() is not 0. Check console log of your browser.';
		//	return;
		//}

		gl.viewport(0,0, texWidth,texHeight);
		gl.useProgram(prog);

		gl.bindBuffer(gl.ARRAY_BUFFER, wordsBuf);

		// first come w0 words of 4 passwords, then w1 words, w2, w3 and again w0 of next 4 passwords
		gl.vertexAttribIPointer(w0Loc, 4, gl.UNSIGNED_INT, 64, 0);
		gl.vertexAttribIPointer(w1Loc, 4, gl.UNSIGNED_INT, 64, 16);
		gl.vertexAttribIPointer(w2Loc, 4, gl.UNSIGNED_INT, 64, 32);
		gl.vertexAttribIPointer(w3Loc, 4, gl.UNSIGNED_INT, 64, 48);

		gl.enableVertexAttribArray(w0Loc);
		gl.enableVertexAttribArray(w1Loc);
		gl.enableVertexAttribArray(w2Loc);
		gl.enableVertexAttribArray(w3Loc);

		gl.uniform4uiv(searchedLoc, searched);
		gl.uniform4ui(afterLastCharLoc, charset.afterLastChar, charset.afterLastChar << 8, charset.afterLastChar << 16, 0);
		gl.uniform4ui(charsOffsetLoc, charsOffset, charsOffset << 8, charsOffset << 16, 0);
		gl.uniform2ui(maskLoc, w0FirstCharsMask, w0RestCharsMask);
		gl.uniform1ui(pwLenLoc, pwLen * 8); // in bits
		gl.uniform1ui(ilCntLoc, innerLoopCnt);

		isRunning = true;
		button.textContent = 'Stop';
		let offset = 0;
		let pointsPerDraw = 1024;
		const t0 = performance.now();
		requestAnimationFrame(draw);


		function ms2time(ms) {
			const seconds = Math.floor((ms / 1000) % 60);
			const minutes = Math.floor((ms / (1000 * 60)) % 60);
			const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);
			const days = Math.floor((ms / (1000 * 60 * 60 * 24)) % 30);
			const months = Math.floor((ms / (1000 * 60 * 60 * 24 * 30)) % 12);
			const years = Math.floor(ms / (1000 * 60 * 60 * 24 * 30 * 12));

			if (years) {
				return years + ' years ' + months + ' months';
			} else if (months) {
				return months + ' months ' + days + ' days';
			} else if (days) {
				return days + ' days ' + hours + ' hours';
			} else if (hours) {
				return hours + ' hours ' + minutes + ' minutes';
			} else if (minutes) {
				return minutes + ' minutes ' + seconds + ' seconds';
			} else {
				return seconds + ' seconds';
			}
		}

		function draw(t1) {
			if (!isRunning) return;
			// 4 password per point each consisting of 4 dwords
			const words = new Uint32Array(pointsPerDraw * PASSWD_PER_POINT * 4);
			const w = new Uint32Array(4);
			for (let i = 0; i < firstCharsCnt; i++) {
				const i4q = Math.floor(i / 4); // quotient
				const i4r = Math.floor(i % 4); // remainder
				w[i4q] |= charset.firstChar << (8 * i4r);
			}
			const w0 = w[0];
			for (let i, p = 0; p < pointsPerDraw * PASSWD_PER_POINT; p++) {
				w[0] = w0;
				w[1] = 0;
				w[2] = 0;
				w[3] = 0;
				let val = offset + p;
				for (i = firstCharsCnt; i < pwLen; i++) {
					const next = Math.floor(val / charset.size);
					const pos = Math.floor(val % charset.size);
					val = next;
					const i4q = Math.floor(i / 4);
					const i4r = Math.floor(i % 4);
					w[i4q] |= (charset.firstChar + pos) << (8 * i4r);
				}
				const i4q = Math.floor(i / 4);
				const i4r = Math.floor(i % 4);
				w[i4q] |= 0x80 << (8 * i4r);

				// first come w0 words of 4 passwords, then w1 words, w2, w3 and again w0 of next 4 passwords
				const idx = 16 * Math.floor(p / 4) + Math.floor(p % 4);
				words[idx +  0] = w[0];
				words[idx +  4] = w[1];
				words[idx +  8] = w[2];
				words[idx + 12] = w[3];
			}
			gl.bufferData(gl.ARRAY_BUFFER, words, gl.DYNAMIC_DRAW);
			gl.drawArrays(gl.POINTS, 0, pointsPerDraw);
			gl.readPixels(0, 0, texWidth, texHeight, gl.RGBA_INTEGER, gl.UNSIGNED_INT, result);
			const t2 = performance.now();
			offset += pointsPerDraw * PASSWD_PER_POINT;
			let totalOffset = innerLoopCnt * offset;
			if (totalOffset >= combsCnt) totalOffset = combsCnt;
			const hashesPerSec = Math.floor(totalOffset / (t2 - t0) * 1000);
			const percentages = (totalOffset / combsCnt * 100).toFixed(1);
			output.innerText =
				`Progress: ${totalOffset} hashes of ${combsCnt} ` +
				`(${(totalOffset / combsCnt * 100).toFixed(1)}%)` +
				`\r\nSpeed: ${hashesPerSec} hash/s ${pointsPerDraw} point/draw` +
				`\r\nEstimated time: ${ms2time((combsCnt - totalOffset) / hashesPerSec * 1000)}`;
			const isDecoded = result[3];
			if (isDecoded || totalOffset >= combsCnt) {
				isRunning = false;
				button.textContent = 'Decode';
				let passwd;
				if (isDecoded) {
					let val = (offset - pointsPerDraw * PASSWD_PER_POINT + PASSWD_PER_POINT * result[0] + result[1]) * Math.pow(charset.size, firstCharsCnt) + result[2];
					const arr = [];
					for (let i = 0; i < pwLen; i++) {
						const next = Math.floor(val / charset.size);
						const pos = Math.floor(val % charset.size);

						val = next;
						arr[i] = pos + charset.firstChar;
					}
					passwd = String.fromCharCode.apply(null, arr);
				} else {
					passwd = 'not found';
				}
				output.innerText =
					`Progress: ${totalOffset} hashes of ${combsCnt} ` +
					`(${(totalOffset / combsCnt * 100).toFixed(1)}%)` +
					`\r\nSpeed: ${hashesPerSec} hash/s ${pointsPerDraw} point/draw` +
					`\r\nTotal time: ${ms2time(t1 - t0)}` +
					`\r\n\r\nPassword: ${passwd}`;
				return;
			}
			if ((t2 - t1) < REFRESH_RATE) {
				pointsPerDraw = Math.min(pointsPerDraw * 2, MAX_POINTS_PER_DRAW);
			}
			requestAnimationFrame(draw);
		}
	}

	function createProgram(gl, vs, fs) {
		const vertexShader = compileShader(gl, gl.VERTEX_SHADER, vs);
		const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, fs);
		const prog = gl.createProgram();

		gl.attachShader(prog, vertexShader);
		gl.attachShader(prog, fragmentShader);
		gl.linkProgram(prog);
		const linked = gl.getProgramParameter(prog, gl.LINK_STATUS);
		if (!linked) {
			output.innerText = `linkProgram: ${gl.getProgramInfoLog(prog)}` +
			`\r\nvs info: ${gl.getShaderInfoLog(vertexShader)}` +
			`\r\nfs info: ${gl.getShaderInfoLog(fragmentShader)}`;

			gl.deleteProgram(prog);
			gl.deleteShader(vertexShader);
			gl.deleteShader(fragmentShader);
			return;
		}
		return prog;


		function compileShader(gl, type, src) {
			const shader = gl.createShader(type);
			gl.shaderSource(shader, src);
			gl.compileShader(shader);

			return shader;
		}
	}
}
