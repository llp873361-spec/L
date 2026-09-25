import * as THREE from 'three'
import { glsl, nois } from '../palette.js'

function rng(s) {
	let a = s >>> 0
	return () => {
		a = a + 0x6D2B79F5 >>> 0
		let t = a
		t = Math.imul(t ^ t >>> 15, t | 1)
		t ^= t + Math.imul(t ^ t >>> 7, t | 61)
		return ((t ^ t >>> 14) >>> 0) / 4294967296
	}
}

const sst = (a, b, x) => {
	const t = Math.min(Math.max((x - a) / (b - a), 0), 1)
	return t * t * (3 - 2 * t)
}

const f4 = v => '(' + v.toFixed(4) + ')'

const dgl = wd => `
uniform float ut, wh;
uniform vec3 sn;
const vec2 wd = vec2(${f4(wd.x)}, ${f4(wd.y)});
vec3 dch(float t) {
	t = clamp(t, 0., 4.);
	vec3 dv = mix(pk4, pk2, 0.18);
	return t < 1. ? mix(dv, pk4, t) : t < 2. ? mix(pk4, pk3, t - 1.) : t < 3. ? mix(pk3, pk6, t - 2.) : mix(pk6, pk7, t - 3.);
}
float sky(vec3 d) {
	float h = max(d.y, 0.);
	float t = 3.62 - 0.95 * smoothstep(0., 0.55, h);
	t += 0.25 * pow(max(dot(d, sn), 0.), 6.);
	return t;
}
float hzt(vec3 d) {
	return 3.35 + 0.2 * pow(max(dot(normalize(vec3(d.x, 0.02, d.z)), sn), 0.), 3.);
}
`

export function make(rd, seed) {
	const mob = !!rd.mob
	const R = rng(seed)
	const scene = new THREE.Scene()
	const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 4000)
	const wa = -0.4 + R() * 0.8
	const wd = new THREE.Vector2(Math.cos(wa), Math.sin(wa))
	const cr = new THREE.Vector2(-wd.y, wd.x)
	const lam = 0.85 + R() * 0.35, hk = 0.8 + R() * 0.45
	const sa0 = (R() < 0.5 ? -1 : 1) * (0.9 + R() * 0.5)
	const sdv = Math.floor(R() * 1e9)
	const hs2 = (x, y) => {
		let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + sdv | 0
		h = Math.imul(h ^ h >>> 13, 1274126177)
		return ((h ^ h >>> 16) >>> 0) / 4294967296
	}
	const vn2 = (x, y) => {
		const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi
		const a = xf * xf * (3 - 2 * xf), b = yf * yf * (3 - 2 * yf)
		const p = hs2(xi, yi) + (hs2(xi + 1, yi) - hs2(xi, yi)) * a
		const q = hs2(xi, yi + 1) + (hs2(xi + 1, yi + 1) - hs2(xi, yi + 1)) * a
		return p + (q - p) * b
	}
	const hgt = (x, z) => {
		const wx = (vn2(x * 0.004 + 3.1, z * 0.004) - 0.5) * 60, wz = (vn2(x * 0.004, z * 0.004 + 7.7) - 0.5) * 60
		const px = x + wx, pz = z + wz
		const a = (px * cr.x + pz * cr.y) * 0.006 / lam, b = (px * wd.x + pz * wd.y) * 0.0125 / lam
		const r1 = 1 - Math.abs(2 * vn2(a, b) - 1)
		const r2 = 1 - Math.abs(2 * vn2(a * 2.3 + 11, b * 2.1 + 5) - 1)
		const h1 = Math.pow(r1, 2.4), h2 = Math.pow(r2, 2.6)
		const hv = 0.55 + 0.9 * vn2(x * 0.003 + 20, z * 0.003 + 40)
		return { h: (h1 * 21 * hv + h2 * 5.5 + vn2(x * 0.03, z * 0.03) * 1.2) * hk, c: Math.max(h1 * hv, h2 * 0.7) }
	}

	let cx = 0, cz = 0, ch = -1
	for (let i = 0; i < 400; i++) {
		const x = (R() - 0.5) * 160, z = (R() - 0.5) * 160
		const q = hgt(x, z).h
		if (q > ch) {
			ch = q
			cx = x
			cz = z
		}
	}
	const cam0 = new THREE.Vector3(cx, ch + 1.7, cz)

	const hn = mob ? 128 : 256, hx0 = cx - 400, hz0 = cz - 760, hw = 800, hd = 860
	const htx = (() => {
		const d = new Uint16Array(hn * hn)
		for (let j = 0; j < hn; j++) {
			for (let i = 0; i < hn; i++) {
				d[j * hn + i] = THREE.DataUtils.toHalfFloat(hgt(hx0 + (i + 0.5) / hn * hw, hz0 + (j + 0.5) / hn * hd).h)
			}
		}
		const t = new THREE.DataTexture(d, hn, hn, THREE.RedFormat, THREE.HalfFloatType)
		t.minFilter = t.magFilter = THREE.LinearFilter
		t.needsUpdate = true
		return t
	})()

	const u = {
		ut: { value: 0 }, wh: { value: 1 }, sn: { value: new THREE.Vector3(0, 1, 0) },
		htx: { value: htx }, hr: { value: new THREE.Vector4(hx0, hz0, hw, hd) }, pr: { value: 1 }
	}
	const dg = dgl(wd)

	const sky = new THREE.Mesh(new THREE.SphereGeometry(3000, 48, 24), new THREE.ShaderMaterial({
		side: THREE.BackSide,
		depthWrite: false,
		uniforms: u,
		vertexShader: `varying vec3 vd;
void main() {
	vd = position;
	gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.);
}`,
		fragmentShader: `${glsl}
${nois}
${dg}
varying vec3 vd;
void main() {
	vec3 d = normalize(vd);
	float t = sky(d);
	t = mix(t, 4., wh);
	gl_FragColor = vec4(dsp(dch(t)), 1.);
}`
	}))
	sky.renderOrder = -1
	scene.add(sky)

	{
		const K = mob ? 120 : 180, M = mob ? 160 : 240, P = [], C = [], I = []
		const a0 = -Math.PI / 2
		for (let i = 0; i <= K; i++) {
			const r = 0.5 + 2600 * Math.pow(i / K, 2.3)
			for (let j = 0; j <= M; j++) {
				const a = a0 + (j / M - 0.5) * 3.1
				const x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r
				const q = hgt(x, z)
				P.push(x, q.h, z)
				C.push(q.c)
				if (i && j) {
					const p0 = (i - 1) * (M + 1) + j - 1, p1 = p0 + 1, p2 = p0 + M + 1, p3 = p2 + 1
					I.push(p0, p1, p3, p0, p3, p2)
				}
			}
		}
		const g = new THREE.BufferGeometry()
		g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3))
		g.setAttribute('cr', new THREE.Float32BufferAttribute(C, 1))
		g.setIndex(I)
		g.computeVertexNormals()
		scene.add(new THREE.Mesh(g, new THREE.ShaderMaterial({
			uniforms: u,
			vertexShader: `attribute float cr;
varying vec3 vw, vn0;
varying float vc;
void main() {
	vw = position;
	vn0 = normal;
	vc = cr;
	gl_Position = projectionMatrix * viewMatrix * vec4(position, 1.);
}`,
			fragmentShader: `${glsl}
${nois}
${dg}
uniform sampler2D htx;
uniform vec4 hr;
varying vec3 vw, vn0;
varying float vc;
float hat(vec2 p) {
	vec2 q = (p - hr.xy) / hr.zw;
	if (q.x < 0. || q.y < 0. || q.x > 1. || q.y > 1.) return -1e3;
	return texture2D(htx, q).r;
}
void main() {
	vec3 V = vw - cameraPosition;
	float l = length(V);
	V /= l;
	vec3 n = normalize(vn0);
	float fw = length(fwidth(vw.xz));
	float aa = 1. - smoothstep(0.03, 0.12, fw);
	float fl = smoothstep(0.55, 0.9, n.y);
	if (aa * fl > 0.01) {
		float k = dot(vw.xz, wd) * 26. + vn(vec3(vw.xz * 0.35, 1.)) * 5. + vn(vec3(vw.xz * 1.7, 4.)) * 1.2;
		float rp = cos(k) * 0.5 + 0.5;
		n = normalize(n + vec3(wd.x, 0., wd.y) * (sin(k) * 0.18 + (rp * rp - 0.4) * 0.05) * aa * fl);
	}
	float nl = dot(n, sn);
	float sh = 1.;
	if (nl > 0. && l < 900.) {
		vec3 p = vw + n * 0.6;
		float s = 1.5;
		for (int i = 0; i < 18; i++) {
			vec3 q = p + sn * s;
			float hh = hat(q.xz);
			sh = min(sh, clamp((q.y - hh) / (s * 0.08) + 0.5, 0., 1.));
			s *= 1.32;
			if (sh < 0.02 || q.y > 60.) break;
		}
	}
	float lit = clamp(nl * 1.6, 0., 1.) * sh;
	float t = 2. + 0.12 * n.y + lit * 1.08;
	float vv = 1. - smoothstep(1.5, 6.5, vw.y - 0.6 * vn(vec3(vw.xz * 0.02, 9.)));
	t = mix(t, 0.35 + 0.5 * lit, vv * (1. - lit * 0.35) * 0.85);
	float cst = smoothstep(0.62, 0.95, vc) * smoothstep(0.25, 0.7, lit);
	t = mix(t, 3.97, cst * 0.9);
	t += pow(max(dot(reflect(V, n), sn), 0.), 24.) * 0.35 * lit;
	float ff = 1. - exp(-l / 1100.);
	t = mix(t, hzt(V), ff);
	t = mix(t, 4., wh);
	gl_FragColor = vec4(dsp(dch(t)), 1.);
}`
		})))
	}

	{
		const na = mob ? 160 : 320, per = 14
		const anc = []
		for (let i = 0; i < 20000 && anc.length < na; i++) {
			const r = 18 + Math.pow(R(), 1.3) * 380, a = -Math.PI / 2 + (R() - 0.5) * 2
			const x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r
			const q = hgt(x, z)
			if (q.c > 0.86) anc.push([x, q.h, z])
		}
		const np = anc.length * per
		const pa = new Float32Array(np * 4), pb = new Float32Array(np * 4)
		for (let i = 0; i < np; i++) {
			const q = anc[Math.floor(i / per)]
			pa.set([q[0] + (R() - 0.5) * 6 * cr.x, q[1] + 0.1, q[2] + (R() - 0.5) * 6 * cr.y, R() * 10], i * 4)
			pb.set([1.6 + R() * 1.8, 2.5 + R() * 3, R(), R()], i * 4)
		}
		const g = new THREE.BufferGeometry()
		g.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(np * 3), 3))
		g.setAttribute('pa', new THREE.Float32BufferAttribute(pa, 4))
		g.setAttribute('pb', new THREE.Float32BufferAttribute(pb, 4))
		const m = new THREE.Points(g, new THREE.ShaderMaterial({
			uniforms: u,
			transparent: true,
			depthWrite: false,
			vertexShader: `${glsl}
${nois}
${dg}
attribute vec4 pa, pb;
uniform float pr;
varying float va, vt;
void main() {
	float tau = mod(ut + pa.w, pb.x);
	float e = tau / pb.x;
	vec3 p = pa.xyz + vec3(wd.x, 0., wd.y) * pb.y * tau + vec3(0., 0.9 * e * (1. - 0.4 * e) + (pb.z - 0.5) * 0.3 * e, 0.);
	p.xz += vec2(-wd.y, wd.x) * sin(tau * 3. + pb.w * 6.283) * 0.3 * e;
	vec4 mv = viewMatrix * vec4(p, 1.);
	gl_Position = projectionMatrix * mv;
	float d = -mv.z;
	float s = 0.06 * pr * 800. / max(d, 1.);
	gl_PointSize = max(s, 1.2 * pr);
	va = sin(3.1416 * e) * 0.55 * clamp(s / (1.2 * pr), 0.15, 1.) * (1. - smoothstep(250., 450., d));
	vt = mix(3.35 + 0.5 * pb.w, 4., wh);
}`,
			fragmentShader: `${glsl}
${nois}
${dg}
varying float va, vt;
void main() {
	vec2 q = gl_PointCoord * 2. - 1.;
	float r = dot(q, q);
	if (r > 1. || va < 0.005) discard;
	gl_FragColor = vec4(dsp(dch(vt)), va * (1. - r));
}`
		}))
		m.frustumCulled = false
		scene.add(m)
	}

	const ti = 3.6
	const look = new THREE.Vector3(), tmp = new THREE.Vector3()
	const v2 = new THREE.Vector2()
	let it = -1, lx = 0, ly = 0, sa = sa0

	function vfov() {
		const a = camera.aspect
		return a < 1 ? Math.min(2 * Math.atan(Math.tan(25 * Math.PI / 180) / a) * 180 / Math.PI, 85) : 50
	}

	function update(dt, t, inp) {
		if (it < 0) it = inp.rm ? ti + 1 : 0
		it += dt
		u.ut.value += dt
		const fv = vfov()
		if (camera.fov !== fv) {
			camera.fov = fv
			camera.updateProjectionMatrix()
		}
		u.wh.value = 1 - sst(0.1, 3.4, it)
		sa += (sa0 + inp.mx * 0.45 - sa) * (1 - Math.exp(-dt * 0.8))
		const se = 0.88
		u.sn.value.set(Math.sin(sa) * Math.cos(se), Math.sin(se), -Math.cos(sa) * Math.cos(se))
		rd.getDrawingBufferSize(v2)
		u.pr.value = rd.getPixelRatio()
		lx += (-inp.mx * 0.05 - lx) * (1 - Math.exp(-dt * 2))
		ly += (inp.my * 0.03 - ly) * (1 - Math.exp(-dt * 2))
		camera.position.copy(cam0)
		look.set(cam0.x + Math.sin(lx) * 10, cam0.y - 1.05 + ly * 10, cam0.z - 10)
		camera.lookAt(look)
		camera.updateMatrixWorld()
		sky.position.copy(camera.position)
		tmp.set(cam0.x + Math.sin(lx) * 1000, cam0.y, cam0.z - 1000).project(camera)
		return { busy: it < ti, bk: 0.25, haze: { y: tmp.y, a: sst(2, 4, it) } }
	}

	function pick() {
		return null
	}

	function dispose() {
		scene.traverse(q => {
			if (q.geometry) q.geometry.dispose()
			if (q.material) q.material.dispose()
		})
		htx.dispose()
	}

	return { scene, camera, update, pick, dispose }
}
