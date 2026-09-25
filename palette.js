export const pal = ['#14040C', '#2A0A1F', '#5A1A45', '#B98AD6', '#D4508A', '#F07A8C', '#FFB6D2', '#FFF0F6']
export const nam = ['酒红黑', '深莓', '梅紫', '丁香粉', '玫瑰粉', '珊瑚粉', '樱花粉', '粉白']
export const rgb = pal.map(h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255))

const mi = [[0.59719, 0.35458, 0.04823], [0.07600, 0.90834, 0.01566], [0.02840, 0.13383, 0.83777]]
const mo = [[1.60475, -0.53108, -0.07367], [-0.10208, 1.10813, -0.00605], [-0.00327, -0.07276, 1.07602]]

function inv(m) {
	const [a, b, c] = m[0], [d, e, f] = m[1], [g, h, i] = m[2]
	const x = e * i - f * h, y = f * g - d * i, z = d * h - e * g
	const det = a * x + b * y + c * z
	return [
		[x / det, (c * h - b * i) / det, (b * f - c * e) / det],
		[y / det, (a * i - c * g) / det, (c * d - a * f) / det],
		[z / det, (b * g - a * h) / det, (a * e - b * d) / det]
	]
}

const fx = v => v.toFixed(6)
export const v3 = c => `vec3(${c.map(fx).join(', ')})`
const m3 = m => `mat3(${[0, 1, 2].map(j => [0, 1, 2].map(i => fx(m[i][j])).join(', ')).join(', ')})`

export const glsl = `
${rgb.map((c, i) => `const vec3 pk${i} = ${v3(c)};`).join('\n')}
const mat3 mii = ${m3(inv(mi))};
const mat3 moi = ${m3(inv(mo))};
vec3 lin3(vec3 c) {
	return mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)), step(0.04045, c));
}
float lum(vec3 c) {
	return dot(c, vec3(0.299, 0.587, 0.114));
}
vec3 chn(vec3 c0, vec3 c1, vec3 c2, vec3 c3, vec4 st, float v, out vec3 a, out vec3 b) {
	if (v < st.y) {
		a = c0;
		b = c1;
		return mix(c0, c1, clamp((v - st.x) / (st.y - st.x), 0., 1.));
	}
	if (v < st.z) {
		a = c1;
		b = c2;
		return mix(c1, c2, (v - st.y) / (st.z - st.y));
	}
	a = c2;
	b = c3;
	return mix(c2, c3, clamp((v - st.z) / (st.w - st.z), 0., 1.));
}
void wlk(inout vec3 c, inout vec3 a, inout vec3 b, vec3 g, vec3 p, vec3 q, float f) {
	if (f <= 0.) return;
	f = min(f, 1.);
	if ((a == p && b == q) || (a == q && b == p)) {
		c = mix(c, g, f);
		return;
	}
	vec3 e1 = a, e2 = p;
	float bl = 1e9;
	for (int i = 0; i < 2; i++) {
		for (int j = 0; j < 2; j++) {
			vec3 x = i == 0 ? a : b, y = j == 0 ? p : q;
			float l = distance(c, x) + distance(x, y) + distance(y, g);
			if (l < bl) {
				bl = l;
				e1 = x;
				e2 = y;
			}
		}
	}
	float l1 = distance(c, e1), l2 = distance(e1, e2), l3 = distance(e2, g);
	float s = f * (l1 + l2 + l3);
	if (s <= l1) {
		c = mix(c, e1, s / max(l1, 1e-5));
	} else if (s <= l1 + l2) {
		c = mix(e1, e2, (s - l1) / max(l2, 1e-5));
		a = e1;
		b = e2;
	} else {
		c = mix(e2, g, (s - l1 - l2) / max(l3, 1e-5));
		a = p;
		b = q;
	}
}
float carc(vec3 c0, vec3 c1, vec3 c2, vec3 c3, vec4 st, float v) {
	float l1 = distance(c0, c1), l2 = distance(c1, c2), l3 = distance(c2, c3);
	float x = clamp(v, st.x, st.w);
	return x < st.y ? l1 * (x - st.x) / (st.y - st.x) : x < st.z ? l1 + l2 * (x - st.y) / (st.z - st.y) : l1 + l2 + l3 * (x - st.z) / (st.w - st.z);
}
vec3 cpos(vec3 c0, vec3 c1, vec3 c2, vec3 c3, float r, out vec3 a, out vec3 b) {
	float l1 = distance(c0, c1), l2 = distance(c1, c2), l3 = distance(c2, c3);
	if (r < l1) {
		a = c0;
		b = c1;
		return mix(c0, c1, max(r, 0.) / max(l1, 1e-5));
	}
	if (r < l1 + l2) {
		a = c1;
		b = c2;
		return mix(c1, c2, (r - l1) / max(l2, 1e-5));
	}
	a = c2;
	b = c3;
	return mix(c2, c3, min((r - l1 - l2) / max(l3, 1e-5), 1.));
}
vec3 fgw(vec3 c0, vec3 c1, vec3 c2, vec3 c3, vec4 st, float v, float ka, vec3 t0, vec3 t1, vec3 t2, vec3 t3, float te, float tg, float f, out vec3 a, out vec3 b) {
	vec4 ix = vec4(0., 1., 2., 3.);
	float sv = carc(c0, c1, c2, c3, st, v), sk = carc(c0, c1, c2, c3, ix, ka);
	vec3 ck = ka < 0.5 ? c0 : ka < 1.5 ? c1 : ka < 2.5 ? c2 : c3;
	vec3 ce = te < 0.5 ? t0 : te < 1.5 ? t1 : te < 2.5 ? t2 : t3;
	float we = carc(t0, t1, t2, t3, ix, te), wg = carc(t0, t1, t2, t3, ix, tg);
	float m0 = abs(sv - sk), m1 = distance(ck, ce);
	float s = clamp(f, 0., 1.) * (m0 + m1 + abs(wg - we));
	if (s <= m0) return cpos(c0, c1, c2, c3, sv + sign(sk - sv) * s, a, b);
	s -= m0;
	if (s <= m1) {
		a = ck;
		b = ce;
		return mix(ck, ce, s / max(m1, 1e-5));
	}
	s -= m1;
	return cpos(t0, t1, t2, t3, we + sign(wg - we) * s, a, b);
}
vec3 pcl(int i) {
	return i < 4 ? (i < 2 ? (i == 0 ? pk0 : pk1) : (i == 2 ? pk2 : pk3)) : (i < 6 ? (i == 4 ? pk4 : pk5) : (i == 6 ? pk6 : pk7));
}
int pnx(int i, bool u) {
	return u ? (i < 4 ? (i < 2 ? i + 1 : (i == 2 ? 3 : 6)) : (i == 4 ? 5 : i == 5 ? 6 : 7)) : (i < 4 ? (i < 2 ? 0 : i - 1) : (i == 4 ? 2 : i - 1));
}
int phh(int i, bool u) {
	return u ? (i < 4 ? (i < 2 ? 5 - i : 5 - i) : (i == 4 ? 3 : i == 5 ? 2 : 7 - i)) : (i < 4 ? i : i - 1);
}
int pki(vec3 c) {
	float d0 = dot(c - pk0, c - pk0), d1 = dot(c - pk1, c - pk1), d2 = dot(c - pk2, c - pk2), d3 = dot(c - pk3, c - pk3);
	float d4 = dot(c - pk4, c - pk4), d5 = dot(c - pk5, c - pk5), d6 = dot(c - pk6, c - pk6), d7 = dot(c - pk7, c - pk7);
	return d0 < 1e-8 ? 0 : d1 < 1e-8 ? 1 : d2 < 1e-8 ? 2 : d3 < 1e-8 ? 3 : d4 < 1e-8 ? 4 : d5 < 1e-8 ? 5 : d6 < 1e-8 ? 6 : d7 < 1e-8 ? 7 : 0;
}
void twk(inout vec3 c, inout vec3 a, inout vec3 b, bool u, float f) {
	if (f <= 0.) return;
	f = min(f, 1.);
	int ia = pki(a), ib = pki(b);
	int ha = phh(ia, u), hb = phh(ib, u);
	int e = hb < ha ? ib : ha < hb ? ia : u ? max(ia, ib) : min(ia, ib);
	int g = u ? 7 : 0;
	vec3 ce = pcl(e);
	float l0 = distance(c, ce);
	float tot = l0;
	int k = e;
	for (int s = 0; s < 6; s++) {
		if (k == g) break;
		int p = pnx(k, u);
		tot += distance(pcl(k), pcl(p));
		k = p;
	}
	float r = f * tot;
	if (r <= l0) {
		c = mix(c, ce, r / max(l0, 1e-5));
		return;
	}
	r -= l0;
	k = e;
	for (int s = 0; s < 6; s++) {
		if (k == g) break;
		int p = pnx(k, u);
		vec3 x = pcl(k), y = pcl(p);
		float l = distance(x, y);
		if (r <= l) {
			c = mix(x, y, r / max(l, 1e-5));
			a = x;
			b = y;
			return;
		}
		r -= l;
		k = p;
	}
	c = pcl(g);
	a = c;
	b = c;
}
vec3 dsp(vec3 c) {
	vec3 a = min(moi * lin3(clamp(c, 0., 1.)), vec3(0.9995));
	vec3 qa = 1. - 0.983729 * a;
	vec3 qb = 0.0245786 - 0.432951 * a;
	vec3 qc = -0.000090537 - 0.238081 * a;
	vec3 v = (-qb + sqrt(max(qb * qb - 4. * qa * qc, 0.))) / (2. * qa);
	return max(mii * v * 0.6, 0.);
}
`

export const nois = `
float hs(vec3 p) {
	p = fract(p * vec3(0.1031, 0.1030, 0.0973));
	p += dot(p, p.yxz + 33.33);
	return fract((p.x + p.y) * p.z);
}
float hs(vec2 p) {
	return hs(vec3(p, 17.17));
}
float vn(vec3 p) {
	vec3 i = floor(p), f = fract(p);
	f = f * f * f * (f * (f * 6. - 15.) + 10.);
	vec2 e = vec2(1., 0.);
	return mix(
		mix(mix(hs(i), hs(i + e.xyy), f.x), mix(hs(i + e.yxy), hs(i + e.xxy), f.x), f.y),
		mix(mix(hs(i + e.yyx), hs(i + e.xyx), f.x), mix(hs(i + e.yxx), hs(i + e.xxx), f.x), f.y),
		f.z);
}
const mat3 nrm3 = mat3(0.00, 0.80, 0.60, -0.80, 0.36, -0.48, -0.60, -0.48, 0.64);
float fbm(vec3 p) {
	float s = 0., a = 0.5;
	for (int i = 0; i < 5; i++) {
		s += a * vn(p);
		p = nrm3 * p * 2.03 + 1.7;
		a *= 0.5;
	}
	return s / 0.96875;
}
`
