import * as THREE from 'three'
import { glsl, nois } from '../palette.js'
import { build } from '../sky.js'

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

export function make(rd, seed) {
	const mob = !!rd.mob
	const R = rng(seed ^ 0x3c6ef372)
	const scene = new THREE.Scene()
	const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.05, 3000)
	const wy = -11, dh = wy + 0.5, cz = 36
	const sk = build(rd, seed, true)
	sk.grp.rotation.x = 0.14
	scene.add(sk.grp, sk.far)
	const pa = (R() - 0.5) * 0.35
	const pd = new THREE.Vector2(Math.sin(pa), -Math.cos(pa)), pq = new THREE.Vector2(Math.cos(pa), Math.sin(pa))
	const cam0 = new THREE.Vector3(0, dh + 1.62, cz)
	const img = new THREE.Vector3(0, 2 * wy, 0)
	const tgt = new THREE.Vector3(0, wy, 0)
	const u = {
		ut: { value: 0 }, fi: { value: 0 }, pr: { value: 1 },
		rtx: { value: null }, tm: { value: new THREE.Matrix4() },
		bz: { value: new THREE.Vector4(0, 0, 1, 0) }, bd: { value: new THREE.Vector2(1, 0) },
		dp: { value: new THREE.Vector4(0, 0, 0, 0) },
		fl: { value: [0, 1, 2, 3, 4, 5].map(() => new THREE.Vector4()) }
	}

	const rsc = mob ? 0.85 : 1
	const rrt = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType })
	u.rtx.value = rrt.texture
	const wat = new THREE.Mesh(new THREE.PlaneGeometry(5000, 5000).rotateX(-Math.PI / 2), new THREE.ShaderMaterial({
		uniforms: u,
		vertexShader: `varying vec3 vw;
void main() {
	vec4 w = modelMatrix * vec4(position, 1.);
	vw = w.xyz;
	gl_Position = projectionMatrix * viewMatrix * w;
}`,
		fragmentShader: `${glsl}
${nois}
uniform sampler2D rtx;
uniform mat4 tm;
uniform float ut;
uniform vec4 bz, dp;
uniform vec2 bd;
varying vec3 vw;
void main() {
	vec3 V = vw - cameraPosition;
	float l = length(V);
	V /= l;
	float fw = length(fwidth(vw.xz));
	vec2 g = (vec2(vn(vec3(vw.xz * 0.7, ut * 0.15)), vn(vec3(vw.xz * 0.7 + 9.1, ut * 0.15))) - 0.5) * 0.02;
	vec2 e = vw.xz - bz.xy;
	float bm = bz.w * exp(-dot(e, e) / (bz.z * bz.z));
	if (bm > 0.002) {
		vec2 d2 = vec2(bd.x * 0.94 - bd.y * 0.34, bd.x * 0.34 + bd.y * 0.94), d3 = vec2(bd.x * 0.9 + bd.y * 0.44, bd.y * 0.9 - bd.x * 0.44);
		float n = vn(vec3(vw.xz * 0.35, ut * 0.3)) * 2. - 1.;
		vec2 w = bd * cos(dot(vw.xz, bd) * 3.2 - ut * 3. + n * 2.) * 0.5 + d2 * cos(dot(vw.xz, d2) * 4.7 - ut * 3.8 + n * 3.) * 0.35 + d3 * cos(dot(vw.xz, d3) * 6.9 - ut * 4.6 + n) * 0.2;
		g += w * bm * (1. - smoothstep(0.05, 0.25, fw));
	}
	if (dp.w > 0.) {
		vec2 q = vw.xz - dp.xy;
		float r = length(q), k = r - dp.z * 2.2;
		g += q / max(r, 1e-3) * sin(k * 6.) * exp(-k * k * 0.6) * dp.w * exp(-dp.z * 0.8) * 0.25;
	}
	vec4 pc = tm * vec4(vw, 1.);
	vec3 rc = texture2D(rtx, pc.xy / pc.w + g * 0.012).rgb;
	float f = 0.8 + 0.18 * pow(1. - max(-V.y, 0.), 3.);
	gl_FragColor = vec4(mix(dsp(mix(pk0, pk1, 0.6)), rc, f), 1.);
}`
	}))
	wat.position.set(0, wy, cz)
	scene.add(wat)

	const pier = (() => {
		const P = [], N = [], D = [], Q = [], I = []
		const ax = [new THREE.Vector3(pq.x, 0, pq.y), new THREE.Vector3(pd.x, 0, pd.y), new THREE.Vector3(0, 1, 0)]
		const c = new THREE.Vector3(), h = [0, 0, 0]
		const box = (uu, vv, y, su, sv, sy, gk) => {
			c.set(cam0.x + pd.x * uu + pq.x * vv, y, cam0.z + pd.y * uu + pq.y * vv)
			h[0] = sv / 2
			h[1] = su / 2
			h[2] = sy / 2
			const r = R()
			for (let a = 0; a < 3; a++) {
				const b = (a + 1) % 3, e = (a + 2) % 3
				for (const s of [1, -1]) {
					const o = P.length / 3
					const cs = s > 0 ? [[-1, -1], [1, -1], [1, 1], [-1, 1]] : [[-1, -1], [-1, 1], [1, 1], [1, -1]]
					for (const [p, q] of cs) {
						P.push(
							c.x + ax[a].x * h[a] * s + ax[b].x * h[b] * p + ax[e].x * h[e] * q,
							c.y + ax[a].y * h[a] * s + ax[b].y * h[b] * p + ax[e].y * h[e] * q,
							c.z + ax[a].z * h[a] * s + ax[b].z * h[b] * p + ax[e].z * h[e] * q
						)
						N.push(ax[a].x * s, ax[a].y * s, ax[a].z * s)
						D.push(ax[gk].x, ax[gk].y, ax[gk].z)
						Q.push(r)
					}
					I.push(o, o + 1, o + 2, o, o + 2, o + 3)
				}
			}
		}
		for (let uu = -0.6; uu < 3.4; uu += 0.185) {
			box(uu + 0.0925, (R() - 0.5) * 0.02, dh - 0.0225 + (R() - 0.5) * 0.008, 0.17 + (R() - 0.5) * 0.016, 4 + (R() - 0.5) * 0.06, 0.045, 0)
		}
		for (const vv of [-1.7, 0, 1.7]) box(1.4, vv, dh - 0.145, 4, 0.1, 0.2, 1)
		box(3.43, 0, dh - 0.12, 0.05, 4.1, 0.28, 0)
		for (const vv of [-2.03, 2.03]) box(1.4, vv, dh - 0.12, 4.1, 0.05, 0.28, 1)
		for (const vv of [-1.9, 1.9]) box(-0.5, vv, (wy + dh - 0.045) / 2, 0.16, 0.16, dh - 0.045 - wy, 2)
		for (const vv of [-1.9, 1.9]) box(3.3, vv, (wy + dh + 0.7) / 2, 0.19, 0.19, dh + 0.7 - wy, 2)
		const g = new THREE.BufferGeometry()
		g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3))
		g.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3))
		g.setAttribute('gd', new THREE.Float32BufferAttribute(D, 3))
		g.setAttribute('gr', new THREE.Float32BufferAttribute(Q, 1))
		g.setIndex(I)
		const m = new THREE.Mesh(g, new THREE.ShaderMaterial({
			uniforms: u,
			vertexShader: `attribute vec3 gd;
attribute float gr;
varying vec3 vw, vnm, vg;
varying float vr;
void main() {
	vw = position;
	vnm = normal;
	vg = gd;
	vr = gr;
	gl_Position = projectionMatrix * viewMatrix * vec4(position, 1.);
}`,
			fragmentShader: `${glsl}
${nois}
uniform vec4 fl[6];
varying vec3 vw, vnm, vg;
varying float vr;
vec3 wch(float t) {
	t = clamp(t, 0., 3.);
	return t < 1. ? mix(pk0, pk1, t) : t < 2. ? mix(pk1, pk2, t - 1.) : mix(pk2, pk4, t - 2.);
}
void main() {
	vec3 n = normalize(vnm);
	vec3 lb = normalize(-vw), li = normalize(vec3(0., ${(2 * wy).toFixed(1)}, 0.) - vw);
	vec3 cr = cross(vg, n);
	float s = dot(vw, vg), a = dot(vw, cr);
	float gn = vn(vec3(s * 0.6, a * 22., vr * 13.)) * 0.6 + vn(vec3(s * 2.1, a * 60., vr * 7.)) * 0.4;
	float t = 0.35 + 0.45 * max(n.y, 0.) + 0.9 * max(dot(n, lb), 0.) + 0.4 * max(dot(n, li), 0.);
	for (int i = 0; i < 6; i++) {
		vec3 d = fl[i].xyz - vw;
		float q = dot(d, d);
		t += fl[i].w * max(dot(n, d) * inversesqrt(q), 0.) / (1. + q * 2.5) * 1.8;
	}
	t *= 0.72 + 0.56 * gn;
	t += (vr - 0.5) * 0.22;
	gl_FragColor = vec4(dsp(wch(t)), 1.);
}`
		}))
		m.frustumCulled = false
		return m
	})()
	scene.add(pier)

	const nf = mob ? 32 : 64
	const fa = new Float32Array(nf * 4), fb = new Float32Array(nf * 4)
	for (let i = 0; i < nf; i++) {
		const uu = 3.5 + Math.pow(R(), 0.8) * 24, vv = (R() - 0.5) * (6 + uu * 0.9)
		fa.set([cam0.x + pd.x * uu + pq.x * vv, wy + 0.12 + Math.pow(R(), 2) * 0.9, cam0.z + pd.y * uu + pq.y * vv, R() * 6.283], i * 4)
		fb.set([0.4 + R() * 1.1, 0.12 + R() * 0.25, 2.2 + R() * 4, R()], i * 4)
	}
	const flies = (() => {
		const g = new THREE.BufferGeometry()
		g.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(nf * 3), 3))
		g.setAttribute('fa', new THREE.Float32BufferAttribute(fa, 4))
		g.setAttribute('fb', new THREE.Float32BufferAttribute(fb, 4))
		const m = new THREE.Points(g, new THREE.ShaderMaterial({
			uniforms: u,
			transparent: true,
			depthWrite: false,
			blending: THREE.AdditiveBlending,
			vertexShader: `${glsl}
attribute vec4 fa, fb;
uniform float ut, pr, fi;
varying float va;
void main() {
	vec3 p = fa.xyz + vec3(sin(ut * fb.y + fa.w) * fb.x, sin(ut * fb.y * 1.37 + fa.w * 2.1) * 0.08 * fb.x, cos(ut * fb.y * 0.83 + fa.w * 1.3) * fb.x);
	float bp = fract(ut / fb.z + fb.w);
	va = (0.12 + 0.88 * smoothstep(0., 0.08, bp) * (1. - smoothstep(0.12, 0.3, bp))) * fi;
	vec4 mv = modelViewMatrix * vec4(p, 1.);
	gl_Position = projectionMatrix * mv;
	gl_PointSize = clamp(0.2 * pr * 700. / max(-mv.z, 0.1), 3. * pr, 15. * pr);
}`,
			fragmentShader: `${glsl}
varying float va;
void main() {
	vec2 q = gl_PointCoord * 2. - 1.;
	float r = dot(q, q);
	if (r > 1. || va < 0.004) discard;
	gl_FragColor = vec4(dsp(pk7) * (exp(-r * 30.) * 0.7 + exp(-r * 5.) * 0.14) * va, 1.);
}`
		}))
		m.frustumCulled = false
		return m
	})()
	scene.add(flies)

	const fp = new THREE.Vector3(), pc = new THREE.Vector3(cam0.x + pd.x * 1.4, dh, cam0.z + pd.y * 1.4)
	const fw = []
	function fpos(i, t) {
		const a = fa[i * 4 + 3], A = fb[i * 4], f = fb[i * 4 + 1]
		fp.set(fa[i * 4] + Math.sin(t * f + a) * A, fa[i * 4 + 1] + Math.sin(t * f * 1.37 + a * 2.1) * 0.08 * A, fa[i * 4 + 2] + Math.cos(t * f * 0.83 + a * 1.3) * A)
		const bp = t / fb[i * 4 + 2] + fb[i * 4 + 3]
		const k = bp - Math.floor(bp)
		return (0.12 + 0.88 * sst(0, 0.08, k) * (1 - sst(0.12, 0.3, k))) * u.fi.value
	}
	function lights() {
		fw.length = 0
		for (let i = 0; i < nf; i++) {
			const b = fpos(i, u.ut.value)
			fw.push([b / (1 + fp.distanceToSquared(pc) * 0.02), fp.x, fp.y, fp.z, b])
		}
		fw.sort((a, b) => b[0] - a[0])
		for (let i = 0; i < 6; i++) u.fl.value[i].set(fw[i][1], fw[i][2], fw[i][3], fw[i][4])
	}

	const mc = new THREE.PerspectiveCamera()
	const tv = new THREE.Vector3(), tmp = new THREE.Vector3(), v2 = new THREE.Vector2()
	const bias = new THREE.Matrix4().set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1)
	function refl() {
		rd.getDrawingBufferSize(v2)
		const w = Math.max(1, Math.round(v2.x * rsc)), h = Math.max(1, Math.round(v2.y * rsc))
		if (rrt.width !== w || rrt.height !== h) rrt.setSize(w, h)
		camera.updateMatrixWorld()
		mc.copy(camera)
		mc.layers.enableAll()
		camera.getWorldDirection(tv)
		mc.position.set(camera.position.x, 2 * wy - camera.position.y, camera.position.z)
		mc.up.set(0, 1, 0)
		mc.lookAt(mc.position.x + tv.x, mc.position.y - tv.y, mc.position.z + tv.z)
		mc.updateMatrixWorld()
		mc.updateProjectionMatrix()
		u.tm.value.copy(bias).multiply(mc.projectionMatrix).multiply(mc.matrixWorldInverse)
		wat.visible = false
		const p0 = sk.pr.value
		sk.pr.value = p0 * rsc
		u.pr.value = p0 * rsc
		sk.far.position.copy(mc.position)
		sk.far.updateMatrixWorld()
		sk.hz.value = -2
		const prv = rd.getRenderTarget()
		rd.setRenderTarget(rrt)
		rd.render(scene, mc)
		rd.setRenderTarget(prv)
		wat.visible = true
		sk.pr.value = p0
		u.pr.value = p0
		sk.far.position.copy(camera.position)
		sk.far.updateMatrixWorld()
		sk.hz.value = 0
	}

	const wp = new THREE.Vector3(), c1 = new THREE.Vector3(), q0 = new THREE.Quaternion(), lk = new THREE.PerspectiveCamera()
	let it = -1, lx = 0, ly = 0, hv = 0, hov = false, dv = -1, f0 = 50, bt = 5 + Math.random() * 4, bs = null

	function vfov() {
		const a = camera.aspect
		return a < 1 ? Math.min(2 * Math.atan(Math.tan(25 * Math.PI / 180) / a) * 180 / Math.PI, 85) : 50
	}

	function update(dt, t, inp) {
		if (it < 0) it = inp.rm ? 9 : 0
		it += dt
		u.ut.value += dt
		u.pr.value = rd.getPixelRatio()
		sk.sr.value = Math.min(Math.pow(Math.max(it - 0.8, 0) / 7, 3.5) * 1.1, 1.1)
		u.fi.value = sst(4.5, 8.5, it)
		hv += ((hov ? 1 : 0) - hv) * (1 - Math.exp(-dt * 6))
		let fd = 0, go
		if (dv < 0) {
			const fv = vfov()
			if (camera.fov !== fv) {
				camera.fov = fv
				camera.updateProjectionMatrix()
			}
			lx += (inp.mx * 0.06 - lx) * (1 - Math.exp(-dt * 1.5))
			ly += (inp.my * 0.04 - ly) * (1 - Math.exp(-dt * 1.5))
			camera.position.set(cam0.x + lx * 0.6, cam0.y + ly * 0.2, cam0.z)
			camera.lookAt(tgt.x + lx * 6, tgt.y + ly * 5, tgt.z)
		} else {
			dv += dt / (inp.rm ? 1 : 3.2)
			const e = inp.rm ? 0 : sst(0, 1, Math.min(dv, 1))
			camera.position.lerpVectors(c1, wp, e * 0.4)
			lk.position.copy(camera.position)
			lk.lookAt(img)
			camera.quaternion.slerpQuaternions(q0, lk.quaternion, sst(0, 0.35, dv))
			camera.fov = f0 * Math.pow(2.2 / f0, inp.rm ? 0 : sst(0.05, 0.95, Math.min(dv, 1)))
			camera.updateProjectionMatrix()
			u.dp.value.z += dt
			fd = sst(inp.rm ? 0 : 0.78, 1, dv)
			if (dv >= 1) go = 'sky'
		}
		if (bs) {
			bs.t += dt
			const e = sst(0, 1.5, bs.t) * (1 - sst(bs.d - 2, bs.d, bs.t))
			u.bz.value.set(bs.x + bs.dx * bs.v * bs.t, bs.z + bs.dz * bs.v * bs.t, bs.r, e * bs.a * (inp.rm ? 0.5 : 1))
			if (bs.t > bs.d) {
				bs = null
				u.bz.value.w = 0
				bt = 8 + Math.random() * 9
			}
		} else if ((bt -= dt) <= 0 && it > 6) {
			const a = Math.random() * Math.PI * 2, dx = Math.cos(a), dz = Math.sin(a)
			const k = 8 + Math.random() * 22, d = 7 + Math.random() * 3, v = 2.5 + Math.random() * 1.5
			bs = { t: 0, d, v, dx, dz, r: 16 + Math.random() * 12, a: 0.6 + Math.random() * 0.5, x: cam0.x + pd.x * k - dx * v * d / 2, z: cam0.z + pd.y * k - dz * v * d / 2 }
			u.bd.value.set(dx, dz)
		}
		camera.updateMatrixWorld()
		sk.upd(dt, t, camera, 0, hv)
		lights()
		refl()
		return { busy: it < 7.5, bk: 0.55, lens: sk.lens(camera, 0), fade: fd, go }
	}

	function pick(nx, ny, clk) {
		if (dv >= 0) {
			hov = false
			return null
		}
		tmp.copy(img).project(camera)
		const d = camera.position.distanceTo(img)
		const r = 1 / Math.sqrt(Math.max(d * d - 1, 1e-3)) / Math.tan(camera.fov * Math.PI / 360)
		hov = tmp.z < 1 && Math.hypot((nx - tmp.x) * camera.aspect, ny - tmp.y) < Math.max(r * 3.5, 0.05)
		if (!hov) return null
		if (clk) {
			dv = 0
			f0 = camera.fov
			c1.copy(camera.position)
			q0.copy(camera.quaternion)
			wp.copy(img).sub(c1).multiplyScalar((c1.y - wy) / (c1.y - img.y)).add(c1)
			u.dp.value.set(wp.x, wp.z, 0, 1)
			hov = false
			console.log('跳进倒影里')
		}
		return { tip: '跳进倒影', anc: img, at: () => img, rad: 1 }
	}

	function dispose() {
		[wat, pier, flies].forEach(m => {
			m.geometry.dispose()
			m.material.dispose()
		})
		rrt.dispose()
		sk.dispose()
	}

	return { scene, camera, update, pick, dispose }
}
