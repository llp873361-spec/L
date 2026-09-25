import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
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

const f4 = v => v.toFixed(4)

const cgl = sn => `
uniform float ut;
const vec3 sn = vec3(${f4(sn.x)}, ${f4(sn.y)}, ${f4(sn.z)});
vec3 skc(float t, out vec3 a, out vec3 b) {
	return cpos(pk3, pk2, pk4, pk5, carc(pk3, pk2, pk4, pk5, vec4(0., 1., 2., 3.), t), a, b);
}
float glw(vec3 d) {
	return pow(max(dot(normalize(d.xz + vec2(0., 1e-4)), normalize(sn.xz)), 0.), 4.);
}
float skt(vec3 d) {
	float h = exp(-max(d.y, 0.) * 6.);
	return 1. + 1.3 * h + 0.65 * h * glw(d) - 0.25 * smoothstep(0.25, 1., d.y);
}
float fgt(vec3 wp, out float tf) {
	vec3 d = wp - cameraPosition;
	float l = length(d);
	d /= l;
	tf = skt(vec3(d.x, 0.015, d.z)) - 0.06;
	return 1. - exp(-pow(l / 235., 2.));
}
`

function hgeo() {
	const P = [], N = [], F = [], I = []
	const quad = (a, b, c, d, n, f) => {
		const o = P.length / 3
		P.push(...a, ...b, ...c, ...d)
		for (let i = 0; i < 4; i++) {
			N.push(...n)
			F.push(f)
		}
		I.push(o, o + 1, o + 2, o, o + 2, o + 3)
	}
	const tri = (a, b, c, n, f) => {
		const o = P.length / 3
		P.push(...a, ...b, ...c)
		for (let i = 0; i < 3; i++) {
			N.push(...n)
			F.push(f)
		}
		I.push(o, o + 1, o + 2)
	}
	quad([-0.5, 0, 0.5], [0.5, 0, 0.5], [0.5, 1, 0.5], [-0.5, 1, 0.5], [0, 0, 1], 0)
	quad([0.5, 0, -0.5], [-0.5, 0, -0.5], [-0.5, 1, -0.5], [0.5, 1, -0.5], [0, 0, -1], 0)
	quad([0.5, 0, 0.5], [0.5, 0, -0.5], [0.5, 1, -0.5], [0.5, 1, 0.5], [1, 0, 0], 0)
	quad([-0.5, 0, -0.5], [-0.5, 0, 0.5], [-0.5, 1, 0.5], [-0.5, 1, -0.5], [-1, 0, 0], 0)
	tri([0.5, 1, 0.5], [0.5, 1, -0.5], [0.5, 2, 0], [1, 0, 0], 2)
	tri([-0.5, 1, -0.5], [-0.5, 1, 0.5], [-0.5, 2, 0], [-1, 0, 0], 2)
	quad([-0.5, 1, 0.5], [0.5, 1, 0.5], [0.5, 2, 0], [-0.5, 2, 0], [0, 1, 1], 1)
	quad([0.5, 1, -0.5], [-0.5, 1, -0.5], [-0.5, 2, 0], [0.5, 2, 0], [0, 1, -1], 1)
	const g = new THREE.BufferGeometry()
	g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3))
	g.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3))
	g.setAttribute('fi', new THREE.Float32BufferAttribute(F, 1))
	g.setIndex(I)
	return g
}

export function make(rd, seed) {
	const mob = !!rd.mob
	const R = rng(seed)
	const S = rng(seed ^ 0x5bd1e995)
	const cg = cgl(new THREE.Vector3(S() * 1.2 - 0.6, 0.05, -1).normalize())
	const co = S() * 40
	const hk = 0.82 + S() * 0.33, kw = 0.8 + S() * 0.4, xo = (S() - 0.5) * 24
	const hgt = (x, z) => {
		const zz = -z
		const up = 34 * hk * sst(28, 150, zz) * (1 - 0.55 * sst(168, 250, zz))
		const wd = Math.max(78 - 0.4 * Math.max(zz - 30, 0), 14) * kw
		const lat = Math.max(0, Math.abs(x - xo * sst(20, 120, zz)) - 0.3 * wd) / wd
		const h = up * Math.max(0, 1 - lat * lat) + 2 - 5 * Math.exp(-((z + 21) ** 2) / 18)
		return Math.max(h, 42.4 * sst(-2, 28, z))
	}
	const scene = new THREE.Scene()
	const camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 0.1, 2500)
	const u = { ut: { value: 0 }, uon: { value: 0 }, rip: { value: new THREE.Vector4(0, -999, 0, -99) }, pr: { value: 1 }, ph: { value: 400 }, pls: { value: 1 } }
	const v2 = new THREE.Vector2(), tmp = new THREE.Vector3()
	const add = { blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }

	const sky = new THREE.Mesh(new THREE.SphereGeometry(1200, 48, 24), new THREE.ShaderMaterial({
		side: THREE.BackSide,
		depthWrite: false,
		uniforms: { ut: u.ut },
		vertexShader: `varying vec3 vd;
void main() {
	vd = position;
	gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.);
}`,
		fragmentShader: `${glsl}
${nois}
${cg}
varying vec3 vd;
void main() {
	vec3 d = normalize(vd);
	float g = glw(d);
	float az = atan(d.x, -d.z);
	float cl = smoothstep(0.52, 0.78, fbm(vec3(az * 2.6 + ${f4(co)}, d.y * 30., 1.7))) * smoothstep(0.015, 0.06, d.y) * (1. - smoothstep(0.12, 0.3, d.y));
	float t = skt(d) + cl * (0.6 * g - 0.3);
	vec2 sp = vec2(az * 42., d.y * 42.);
	vec2 si = floor(sp), sf = fract(sp) - 0.5;
	float sh = hs(vec3(si, 3.3));
	float st = step(0.94, sh) * (1. - smoothstep(0.03, 0.1, length(sf - (vec2(hs(vec3(si, 1.1)), hs(vec3(si, 2.2))) - 0.5) * 0.6))) * smoothstep(0.28, 0.6, d.y) * (0.6 + 0.4 * sin(ut * (1. + sh * 3.) + sh * 40.));
	vec3 a, b;
	vec3 c = skc(t, a, b);
	c = mix(c, mix(pk6, pk7, 0.3), st * 0.7);
	gl_FragColor = vec4(dsp(c), 1.);
}`
	}))
	sky.renderOrder = -1
	scene.add(sky)

	const sgm = (fm, top) => new THREE.ShaderMaterial({
		uniforms: { ut: u.ut },
		vertexShader: `varying vec3 vw, vnr;
void main() {
	vec4 w = modelMatrix * vec4(position, 1.);
	vw = w.xyz;
	vnr = normalize(mat3(modelMatrix) * normal);
	gl_Position = projectionMatrix * viewMatrix * w;
}`,
		fragmentShader: `${glsl}
${nois}
${cg}
varying vec3 vw, vnr;
void main() {
	vec3 N = normalize(vnr);
	float gs = max(dot(N, normalize(vec3(sn.x, 0.35, sn.z))), 0.);
	float v = ${f4(top)} + 0.12 * max(N.y, 0.) + 0.16 * gs + 0.05 * (vn(vw * 0.7) - 0.5);
	float tf;
	float ff = fgt(vw, tf) * ${f4(fm)};
	vec3 a, b;
	vec3 c = fgw(pk0, pk1, pk2, pk4, vec4(0., 0.3, 0.72, 1.), v, 2., pk3, pk2, pk4, pk5, 1., tf, ff, a, b);
	gl_FragColor = vec4(dsp(c), 1.);
}`
	})

	{
		const g = new THREE.PlaneGeometry(320, 300, 160, 150)
		g.rotateX(-Math.PI / 2)
		g.translate(0, 0, -95)
		const p = g.attributes.position
		for (let i = 0; i < p.count; i++) p.setY(i, hgt(p.getX(i), p.getZ(i)))
		g.computeVertexNormals()
		const tm = sgm(1, 0.14)
		scene.add(new THREE.Mesh(g, tm))
		const sh = new THREE.Shape()
		sh.moveTo(-2000, -400)
		sh.lineTo(2000, -400)
		sh.lineTo(2000, 3600)
		sh.lineTo(-2000, 3600)
		sh.lineTo(-2000, -400)
		const hl = new THREE.Path()
		hl.moveTo(-159, -54)
		hl.lineTo(-159, 244)
		hl.lineTo(159, 244)
		hl.lineTo(159, -54)
		hl.lineTo(-159, -54)
		sh.holes.push(hl)
		const fg = new THREE.ShapeGeometry(sh)
		fg.rotateX(-Math.PI / 2)
		fg.translate(0, 1.2, 0)
		scene.add(new THREE.Mesh(fg, tm))
	}

	{
		const g = new THREE.PlaneGeometry(420, 9)
		g.rotateX(-Math.PI / 2)
		g.translate(0, -1.3, -21)
		scene.add(new THREE.Mesh(g, new THREE.ShaderMaterial({
			uniforms: { ut: u.ut },
			vertexShader: `varying vec3 vw;
void main() {
	vec4 w = modelMatrix * vec4(position, 1.);
	vw = w.xyz;
	gl_Position = projectionMatrix * viewMatrix * w;
}`,
			fragmentShader: `${glsl}
${nois}
${cg}
varying vec3 vw;
void main() {
	vec3 r = reflect(normalize(vw - cameraPosition), vec3(0., 1., 0.));
	r.xz += (vec2(vn(vec3(vw.xz * vec2(0.3, 1.4), ut * 0.5)), vn(vec3(vw.xz * vec2(0.3, 1.4) + 7., ut * 0.5))) - 0.5) * 0.12;
	float t = mix(skt(normalize(r)), 1., 0.4);
	float tf;
	float ff = fgt(vw, tf);
	vec3 a, b;
	gl_FragColor = vec4(dsp(skc(mix(t, tf, ff), a, b)), 1.);
}`
		})))
	}

	const nmax = mob ? 800 : 1600
	const hus = []
	const lamps = []
	const rows = []
	for (let zz = 38 + R() * 3; zz < 152; zz += 7.5 + R() * 2.5) rows.push(zz)
	const put = (cx, cz, w, d, bon) => {
		const g = hgt(cx, cz)
		if (g < 0.8) return
		const fl = 1 + Math.floor(R() * 2.6)
		const rot = R() < 0.3
		hus.push({
			x: cx, y: g - 1.2, z: cz, yaw: (R() - 0.5) * 0.12 + (rot ? Math.PI / 2 : 0),
			w: rot ? d : w, hw: fl * 1.9 + 1.7, d: rot ? w : d, rh: 1 + R() * 1.4 + (w < 3 ? 0.6 : 0),
			sd: R(), pl: 0.3 + R() * 0.45, on: bon + R() * 0.45
		})
	}
	for (let r = 0; r < rows.length - 1 && hus.length < nmax; r++) {
		const z0 = rows[r], z1 = rows[r + 1]
		const wd = Math.max(78 - 0.4 * Math.max(z0 - 30, 0), 14) * kw
		const xs = xo * sst(20, 120, z0)
		let x = xs - wd * 0.92
		while (x < xs + wd * 0.92 && hus.length < nmax) {
			const bx1 = Math.min(x + 8 + R() * 6, xs + wd * 0.92)
			const bon = 0.3 + R() * 3.2
			for (const zo of z1 - z0 > 8.3 ? [1, 4.9] : [1]) {
				let hx = x + 0.4
				while (hus.length < nmax) {
					const w = 2.3 + R() * 2.3, d = 2.6 + R() * 1.6
					if (hx + w > bx1) break
					put(hx + w / 2, -(z0 + zo + d / 2 + R() * 0.6), w, d, bon)
					hx += w + 0.15 + R() * 0.7
				}
			}
			for (let lx = x + 2 + R() * 3; lx < bx1; lx += 5 + R() * 4) {
				const lz = -(z0 + 0.5)
				const g = hgt(lx, lz)
				if (g > 0.8) lamps.push([lx, g + 2.2, lz, bon])
			}
			x = bx1 + 1.1 + R() * 1.1
		}
	}

	const hm = (() => {
		const g = hgeo()
		const n = hus.length
		const ah = new Float32Array(n * 4), ab = new Float32Array(n * 4)
		hus.forEach((h, i) => {
			ah.set([h.w, h.hw, h.d, h.rh], i * 4)
			ab.set([h.sd, h.pl, h.on, 0], i * 4)
			h.c = Math.cos(h.yaw)
			h.s = Math.sin(h.yaw)
		})
		g.setAttribute('ah', new THREE.InstancedBufferAttribute(ah, 4))
		g.setAttribute('ab', new THREE.InstancedBufferAttribute(ab, 4))
		const mat = new THREE.ShaderMaterial({
			uniforms: { ut: u.ut, uon: u.uon, rip: u.rip },
			vertexShader: `
attribute vec4 ah, ab;
attribute float fi;
varying vec3 vw, vnr, vc, vo;
varying vec4 vh, vb;
varying float vf;
void main() {
	vec3 p = position;
	vec3 q = fi < 0.5 ? p * ah.xyz : fi < 1.5 ? vec3(p.x * (ah.x + 0.3), ah.y + (p.y - 1.) * ah.w, p.z * (ah.z + 0.3)) : vec3(p.x * ah.x, ah.y + (p.y - 1.) * ah.w, p.z * ah.z);
	vec3 n = fi > 0.5 && fi < 1.5 ? normalize(vec3(0., ah.z * 0.5 + 0.15, sign(normal.z) * ah.w)) : normal;
	vec4 w = modelMatrix * instanceMatrix * vec4(q, 1.);
	vw = w.xyz;
	vnr = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * n);
	vc = (modelMatrix * instanceMatrix * vec4(0., 0., 0., 1.)).xyz;
	vo = n;
	vh = ah;
	vb = ab;
	vf = fi;
	gl_Position = projectionMatrix * viewMatrix * w;
}`,
			fragmentShader: `${glsl}
${nois}
${cg}
uniform float uon;
uniform vec4 rip;
varying vec3 vw, vnr, vc, vo;
varying vec4 vh, vb;
varying float vf;
void main() {
	vec3 N = normalize(vnr);
	float gs = max(dot(N, normalize(vec3(sn.x, 0.3, sn.z))), 0.);
	float v, lit = 0., lh = 0.5;
	vec3 la = pk5, lb = pk6;
	if (vf < 0.5 || vf > 1.5) {
		vec3 T = normalize(cross(vec3(0., 1., 0.), N));
		float x = dot(vw - vc, T);
		float y = vw.y - vc.y - 1.2;
		float L = abs(vo.z) > 0.5 ? vh.x : vh.z;
		v = 0.25 + 0.15 * gs + 0.05 * smoothstep(0., 2.5, y);
		float nc = floor((L - 0.45) / 1.25);
		if (vf < 0.5 && nc >= 1.) {
			float cu = x / 1.25 + nc * 0.5, fy = (y - 0.55) / 1.9;
			float ci = floor(cu), fl = floor(fy);
			float aa = clamp(1.6 - length(fwidth(vec2(cu, fy))) * 3., 0., 1.);
			float ok = step(0., ci) * step(ci, nc - 1.) * step(0., fl) * step(y, vh.y - 1.2 - 0.45);
			vec2 f = vec2((fract(cu) - 0.5) * 1.25, fract(fy) * 1.9);
			float ar = length(vec2(f.x, max(f.y - 0.95, 0.)));
			float win = ok * (1. - smoothstep(0.2, 0.25, ar)) * smoothstep(0.12, 0.18, f.y);
			vec3 id = vec3(ci, fl, vb.x * 91. + dot(vo, vec3(1., 2., 3.)) * 7.);
			float h1 = hs(id);
			float on = step(h1, vb.y);
			on = abs(on - step(0.965, hs(id + floor(ut / 8. + h1 * 8.))));
			on *= step(vb.z, uon);
			vec3 wc = vc + T * ((ci + 0.5 - nc * 0.5) * 1.25) + vec3(0., 1.75 + fl * 1.9 + 0.55, 0.);
			float dr = distance(wc, rip.xyz);
			float tt = ut - rip.w - dr / 6.;
			float rp = (1. - smoothstep(4., 7., dr)) * smoothstep(0., 0.05, tt) * (1. - smoothstep(0.3, 0.55, tt));
			on = mix(on, 1. - on, rp);
			lit = mix(ok * vb.y * 0.2 * step(vb.z, uon), win * on, aa);
			v -= win * (1. - on) * 0.1 * aa;
			lh = hs(id + 5.5);
			if (hs(id + 8.8) > 0.93) {
				la = pk6;
				lb = pk7;
				lh = 0.6;
			}
		}
	} else {
		float k = clamp((vw.y - vc.y - vh.y) / max(vh.w, 0.1), 0., 1.);
		v = 0.16 + 0.1 * gs + 0.22 * smoothstep(0.82, 1., k) + 0.04 * step(0.5, fract((vw.y - vc.y) * 3.2));
	}
	float tf;
	float ff = fgt(vw, tf);
	vec3 a, b;
	vec3 c = fgw(pk0, pk1, pk2, pk4, vec4(0., 0.3, 0.72, 1.), v, 2., pk3, pk2, pk4, pk5, 1., tf, ff, a, b);
	float lw = lit * (1. - ff * 0.7);
	c = mix(c, mix(la, lb, lh), lw);
	if (lw > 0.5) {
		a = la;
		b = lb;
	}
	gl_FragColor = vec4(dsp(c), 1.);
}`
		})
		const im = new THREE.InstancedMesh(g, mat, n)
		const m4 = new THREE.Matrix4(), qt = new THREE.Quaternion(), one = new THREE.Vector3(1, 1, 1), ax = new THREE.Vector3(0, 1, 0)
		hus.forEach((h, i) => {
			m4.compose(tmp.set(h.x, h.y, h.z), qt.setFromAxisAngle(ax, h.yaw), one)
			im.setMatrixAt(i, m4)
		})
		im.frustumCulled = false
		scene.add(im)
		return im
	})()

	const tw = { x: xo + (R() - 0.5) * 8, z: -(160 + R() * 6) }
	tw.y = hgt(tw.x, tw.z)
	tw.top = new THREE.Vector3(tw.x, tw.y + 25.3, tw.z)
	{
		const body = new THREE.CylinderGeometry(2.3, 2.7, 24, 8)
		body.translate(0, 12, 0)
		const room = new THREE.CylinderGeometry(1.5, 1.5, 2.6, 8, 1, true)
		room.translate(0, 25.3, 0)
		const spire = new THREE.CylinderGeometry(0.05, 3.2, 10, 8)
		spire.translate(0, 31.6, 0)
		const g = mergeGeometries([body.toNonIndexed(), spire.toNonIndexed()])
		const m = new THREE.Mesh(g, sgm(0.3, 0.08))
		m.position.set(tw.x, tw.y, tw.z)
		scene.add(m)
		const rom = new THREE.Mesh(room, new THREE.ShaderMaterial({
			uniforms: { pls: u.pls },
			side: THREE.DoubleSide,
			vertexShader: `varying vec2 vu;
void main() {
	vu = uv;
	gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.);
}`,
			fragmentShader: `${glsl}
uniform float pls;
varying vec2 vu;
void main() {
	float bar = step(0.5, fract(vu.x * 8.)) * smoothstep(0.1, 0.25, vu.y) * (1. - smoothstep(0.75, 0.9, vu.y));
	gl_FragColor = vec4(dsp(mix(pk5, pk6, 0.5 + 0.5 * pls)) * (0.25 + 0.75 * bar), 1.);
}`
		}))
		rom.position.set(tw.x, tw.y, tw.z)
		scene.add(rom)
		body.dispose()
		spire.dispose()
	}

	{
		const gs = []
		const bx = [(R() - 0.5) * 60]
		bx.push(bx[0] + (R() < 0.5 ? -1 : 1) * (24 + R() * 18))
		for (const x of bx) {
			const sh = new THREE.Shape()
			sh.moveTo(-6.5, -1.5)
			sh.lineTo(-6.5, 3.4)
			sh.lineTo(6.5, 3.4)
			sh.lineTo(6.5, -1.5)
			sh.lineTo(3.6, -1.5)
			sh.absarc(0, -1.5, 3.6, 0, Math.PI, false)
			sh.lineTo(-6.5, -1.5)
			const g = new THREE.ExtrudeGeometry(sh, { depth: 3.2, bevelEnabled: false, curveSegments: 16 })
			g.rotateY(Math.PI / 2)
			g.translate(x - 1.6, 0, -21)
			gs.push(g)
			lamps.push([x, 5, -26.8, 0.2], [x, 5, -15.2, 0.2])
		}
		const g = mergeGeometries(gs)
		gs.forEach(q => q.dispose())
		scene.add(new THREE.Mesh(g, sgm(1, 0.1)))
	}

	{
		const gs = []
		const box = (w, h, d, x, y, z) => {
			const g = new THREE.BoxGeometry(w, h, d)
			g.translate(x, y, z)
			gs.push(g.toNonIndexed())
			g.dispose()
		}
		box(7, 1.2, 6, 0, 41.8, 30)
		box(0.4, 0.7, 6, -2.9, 42.75, 30)
		box(0.4, 0.7, 6, 2.9, 42.75, 30)
		for (let k = 1; k <= 9; k++) {
			const y = 42.4 - k * 0.3, z = 27 - k * 0.72
			box(5.4, y - 32, 0.72, 0, (y + 32) / 2, z + 0.36)
			box(0.4, y - 31.3, 0.72, -2.9, (y + 32.7) / 2, z + 0.36)
			box(0.4, y - 31.3, 0.72, 2.9, (y + 32.7) / 2, z + 0.36)
		}
		const g = mergeGeometries(gs)
		gs.forEach(q => q.dispose())
		scene.add(new THREE.Mesh(g, sgm(0.2, 0.12)))
	}

	const sprite = (list, sz, cl, extra) => {
		const n = list.length
		const pos = new Float32Array(n * 3), aa = new Float32Array(n * 4)
		list.forEach((l, i) => {
			pos.set([l[0], l[1], l[2]], i * 3)
			aa.set([l[3] || 0, l[4] || 0, l[5] || 0, l[6] || 0], i * 4)
		})
		const g = new THREE.BufferGeometry()
		g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
		g.setAttribute('aa', new THREE.BufferAttribute(aa, 4))
		const p = new THREE.Points(g, new THREE.ShaderMaterial({
			...add,
			uniforms: { ut: u.ut, uon: u.uon, ph: u.ph, pls: u.pls },
			vertexShader: `${glsl}
${nois}
attribute vec4 aa;
uniform float ut, uon, ph, pls;
varying vec3 vc;
varying float va;
void main() {
	vec3 p = position;
	va = 1.;
	${extra}
	vec4 mv = viewMatrix * vec4(p, 1.);
	gl_Position = projectionMatrix * mv;
	float d = max(-mv.z, 0.1);
	gl_PointSize = clamp(${f4(sz)} * projectionMatrix[1][1] * ph / d, 2., 60.);
	va *= exp(-pow(d / 260., 2.));
	vc = dsp(${cl});
}`,
			fragmentShader: `
varying vec3 vc;
varying float va;
void main() {
	vec2 q = gl_PointCoord * 2. - 1.;
	float r = dot(q, q);
	if (r > 1. || va < 0.004) discard;
	gl_FragColor = vec4(vc * (exp(-r * 9.) + exp(-r * 2.5) * 0.18) * va, 1.);
}`
		}))
		p.frustumCulled = false
		scene.add(p)
		return p
	}

	sprite(lamps.slice(0, mob ? 110 : 220), 0.55, 'mix(pk5, pk6, 0.35)', 'va = step(aa.x, uon) * 0.9;')

	const nl = mob ? 5 : 10
	const lan = []
	for (let i = 0; i < nl; i++) {
		const h = hus[Math.floor(R() * hus.length)]
		lan.push([h.x + (R() - 0.5) * 3, h.y + h.hw + 1, h.z, 0.7 + R() * 0.6, R() * 50, 40 + R() * 20, R() * 6.28])
	}
	sprite(lan, 1.7, 'mix(pk5, pk6, 0.55)', `float tau = mod(ut * aa.x + aa.y, aa.z);
	p += vec3(sin(tau * 0.25 + aa.w) * 2.5 + tau * 0.3, tau, cos(tau * 0.2 + aa.w) * 1.5);
	va = smoothstep(0., 3., tau) * (1. - smoothstep(aa.z - 8., aa.z, tau)) * (0.8 + 0.2 * sin(ut * 5. + aa.w * 9.));`)

	sprite([[tw.top.x, tw.top.y, tw.top.z]], 5.5, 'mix(pk6, pk7, 0.85)', 'va = 0.55 + 0.45 * pls;')

	const P1 = new THREE.Vector3(0, 44.05, 27.8), L1 = new THREE.Vector3(0, 20, -75)
	const P0 = new THREE.Vector3(0, 175, -35), L0 = new THREE.Vector3(0, 6, -88)
	const look = new THREE.Vector3()
	const ray = new THREE.Raycaster()
	const ti = 4.6
	let it = -1, lx = 0, ly = 0

	function vfov() {
		const a = camera.aspect
		return a < 1 ? Math.min(2 * Math.atan(Math.tan(35 * Math.PI / 180) / a) * 180 / Math.PI, 85) : 45
	}

	function update(dt, t, inp) {
		if (it < 0) it = inp.rm ? ti : 0
		it += dt
		u.ut.value = t
		u.uon.value = it
		u.pls.value = 0.5 + 0.5 * Math.sin(t * 1.3)
		const fv = vfov()
		if (camera.fov !== fv) {
			camera.fov = fv
			camera.updateProjectionMatrix()
		}
		const e = sst(0, ti, it)
		if (it < ti) {
			camera.position.lerpVectors(P0, P1, e)
			camera.position.y += Math.sin(e * Math.PI) * 12
			look.lerpVectors(L0, L1, e)
		} else {
			lx += (-inp.mx * 7 - lx) * (1 - Math.exp(-dt * 2))
			ly += (inp.my * 3.5 - ly) * (1 - Math.exp(-dt * 2))
			camera.position.copy(P1)
			look.set(L1.x + lx, L1.y + ly, L1.z)
		}
		camera.lookAt(look)
		camera.updateMatrixWorld()
		sky.position.copy(camera.position)
		rd.getDrawingBufferSize(v2)
		u.ph.value = v2.y * 0.5
		tmp.copy(tw.top).project(camera)
		const d = camera.position.distanceTo(tw.top)
		const foc = tmp.z < 1 ? { x: tmp.x, y: tmp.y, r: 3.2 / d / Math.tan(camera.fov * Math.PI / 360), k: 0.16 } : null
		return { busy: it < ti, fade: 1 - sst(0, 0.5, it), foc, bk: 1 }
	}

	function pick(nx, ny, clk) {
		if (it < ti) return null
		ray.setFromCamera(v2.set(nx, ny), camera)
		const o = ray.ray.origin, dr = ray.ray.direction
		let bt = 1e9, bh = null
		for (const h of hus) {
			const ox = o.x - h.x, oy = o.y - h.y, oz = o.z - h.z
			const lx0 = ox * h.c - oz * h.s, lz0 = ox * h.s + oz * h.c
			const dx = dr.x * h.c - dr.z * h.s, dz = dr.x * h.s + dr.z * h.c
			let t0 = 0, t1 = bt
			const slab = (p, q, lo, hi) => {
				if (Math.abs(q) < 1e-9) return p >= lo && p <= hi
				let a = (lo - p) / q, b = (hi - p) / q
				if (a > b) [a, b] = [b, a]
				t0 = Math.max(t0, a)
				t1 = Math.min(t1, b)
				return t0 <= t1
			}
			if (slab(lx0, dx, -h.w / 2, h.w / 2) && slab(oy, dr.y, 0, h.hw) && slab(lz0, dz, -h.d / 2, h.d / 2) && t0 < bt) {
				bt = t0
				bh = h
			}
		}
		if (!bh) return null
		const hp = o.clone().addScaledVector(dr, bt)
		if (clk) u.rip.value.set(hp.x, hp.y, hp.z, u.ut.value)
		return { tip: '', anc: hp }
	}

	function dispose() {
		scene.traverse(q => {
			if (q.geometry) q.geometry.dispose()
			if (q.material) q.material.dispose()
		})
		hm.dispose()
	}

	return { scene, camera, update, pick, dispose }
}
