import * as THREE from 'three';

import { ComponentEcs } from '#/ecs/Component.ecs';
import { loadTexture } from '@/utils/assets.utils';
import { RenderClientEcs } from '../renderClient.ecs';
import { Character3DEcs } from '../player/character3D.ecs';
import type { BossParticleConfig } from './boss-particle.config';

// ---------------------------------------------------------------------------
// Vertex shader: GPU billboard + per-instance opacity
// Extracts world position and uniform scale from instanceMatrix, then
// reconstructs the quad using camera right/up axes from the viewMatrix.
// This means all instances are billboarded in a single draw call.
// ---------------------------------------------------------------------------
const VERTEX_SHADER = /* glsl */ `
  attribute float instanceOpacity;

  varying vec2  vUv;
  varying float vOpacity;

  void main() {
    vUv     = uv;
    vOpacity = instanceOpacity;

    // World position encoded in the translation column of instanceMatrix
    vec3 worldPos = vec3(instanceMatrix[3]);

    // Uniform scale encoded as the length of the first column of instanceMatrix
    float scale = length(vec3(instanceMatrix[0]));

    // Camera right/up from the view matrix (transpose of rotation block)
    vec3 right = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
    vec3 up    = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);

    // Expand the unit quad in camera space
    vec3 vertex = worldPos
                + right * position.x * scale
                + up    * position.y * scale;

    gl_Position = projectionMatrix * viewMatrix * vec4(vertex, 1.0);
  }
`;

// ---------------------------------------------------------------------------
// Fragment shader: texture tint + per-instance opacity fade
// ---------------------------------------------------------------------------
const FRAGMENT_SHADER = /* glsl */ `
  uniform sampler2D map;
  uniform vec3      color;

  varying vec2  vUv;
  varying float vOpacity;

  void main() {
    vec4 tex = texture2D(map, vUv);
    gl_FragColor = vec4(tex.rgb * color, tex.a * vOpacity);
  }
`;

// ---------------------------------------------------------------------------
// Internal particle state (all CPU-side bookkeeping)
// ---------------------------------------------------------------------------
interface BossParticle {
	index: number;
	posX: number;
	posY: number;
	posZ: number;
	velX: number;
	velY: number;
	velZ: number;
	elapsed: number;
	duration: number;
	baseScale: number;
	active: boolean;
}

// ---------------------------------------------------------------------------
// Scratch objects reused every frame to avoid GC pressure
// ---------------------------------------------------------------------------
const _pos = new THREE.Vector3();
const _rot = new THREE.Quaternion();
const _scale = new THREE.Vector3();
const _matrix = new THREE.Matrix4();

export class BossParticleEmitterEcs extends ComponentEcs {
	private renderClient: RenderClientEcs = null!;
	private character3D: Character3DEcs = null!;

	private mesh: THREE.InstancedMesh = null!;
	private opacityAttr: THREE.BufferAttribute = null!;
	private pool: BossParticle[] = [];
	private emitCooldown = 0;

	constructor(private readonly config: BossParticleConfig) {
		super();
	}

	onStart(): void {
		this.renderClient = this.world
			.get(RenderClientEcs)
			.unwrap('RenderClientEcs not found');

		this.character3D = this.world
			.getEntity(this.parent)
			.map((e) => e.getUnsafe(Character3DEcs))
			.unwrap('Character3DEcs not found');

		const { config } = this;

		// Per-instance opacity buffer (one float per particle)
		const opacityData = new Float32Array(config.poolSize);
		this.opacityAttr = new THREE.BufferAttribute(opacityData, 1);

		// Unit quad geometry — billboard expansion happens in the vertex shader
		const geometry = new THREE.PlaneGeometry(1, 1);
		geometry.setAttribute('instanceOpacity', this.opacityAttr);

		const color = new THREE.Color(config.color);
		const texture = this.getTexture(config.texture);

		const material = new THREE.ShaderMaterial({
			uniforms: {
				map: { value: texture },
				color: { value: color },
			},
			vertexShader: VERTEX_SHADER,
			fragmentShader: FRAGMENT_SHADER,
			transparent: true,
			depthWrite: false,
			blending: THREE.AdditiveBlending,
		});

		this.mesh = new THREE.InstancedMesh(geometry, material, config.poolSize);
		this.mesh.frustumCulled = false; // Particles can extend beyond boss AABB

		// Init all instances as invisible (scale = 0)
		_rot.identity();
		_scale.setScalar(0);
		for (let i = 0; i < config.poolSize; i++) {
			_pos.set(0, 0, 0);
			_matrix.compose(_pos, _rot, _scale);
			this.mesh.setMatrixAt(i, _matrix);
			opacityData[i] = 0;

			this.pool.push({
				index: i,
				posX: 0, posY: 0, posZ: 0,
				velX: 0, velY: 0, velZ: 0,
				elapsed: 0,
				duration: 0,
				baseScale: 0,
				active: false,
			});
		}

		this.mesh.instanceMatrix.needsUpdate = true;
		this.renderClient.scene.add(this.mesh);

		this.callOnDelete(() => {
			this.renderClient.scene.remove(this.mesh);
			geometry.dispose();
			material.dispose();
		});
	}

	private getTexture(path: string): THREE.Texture {
		return loadTexture(path);
	}

	private acquireParticle(): BossParticle | null {
		for (const p of this.pool) {
			if (!p.active) return p;
		}
		return null;
	}

	private emit(): void {
		const { config } = this;
		const origin = this.character3D.object3D.position;

		for (let i = 0; i < config.particlesPerEmit; i++) {
			const p = this.acquireParticle();
			if (!p) break;

			const hSpeed =
				config.speed.horizontal[0] +
				Math.random() * (config.speed.horizontal[1] - config.speed.horizontal[0]);

			const vSpeed =
				config.speed.vertical[0] +
				Math.random() * (config.speed.vertical[1] - config.speed.vertical[0]);

			const angle = Math.random() * Math.PI * 2;

			p.posX = origin.x + config.offset.x;
			p.posY = origin.y + config.offset.y;
			p.posZ = origin.z + config.offset.z;
			p.velX = Math.cos(angle) * hSpeed;
			p.velY = vSpeed;
			p.velZ = Math.sin(angle) * hSpeed;
			p.elapsed = 0;
			p.duration =
				config.duration[0] +
				Math.random() * (config.duration[1] - config.duration[0]);
			p.baseScale =
				config.scale[0] + Math.random() * (config.scale[1] - config.scale[0]);
			p.active = true;
		}
	}

	onLoop(delta: number): void {
		// Emit
		this.emitCooldown -= delta;
		if (this.emitCooldown <= 0) {
			this.emitCooldown = this.config.emitRate;
			this.emit();
		}

		const { config, pool } = this;
		const dtSec = delta * 0.001;
		const decayFactor = Math.exp(-config.speed.deceleration * dtSec);

		const opacityData = this.opacityAttr.array as Float32Array;
		let dirty = false;

		_rot.identity();

		for (const p of pool) {
			if (!p.active) continue;

			p.elapsed += delta;
			const t = Math.min(p.elapsed / p.duration, 1);

			// Horizontal deceleration — exponential so it starts fast, fades smoothly
			p.velX *= decayFactor;
			p.velZ *= decayFactor;

			// Integrate position — vertical velocity is constant
			p.posX += p.velX * dtSec;
			p.posY += p.velY * dtSec;
			p.posZ += p.velZ * dtSec;

			// Scale decay
			const currentScale = p.baseScale * (1 - config.scaleDecay * t);

			// Upload matrix (position + scale) to the instance
			_pos.set(p.posX, p.posY, p.posZ);
			_scale.setScalar(currentScale);
			_matrix.compose(_pos, _rot, _scale);
			this.mesh.setMatrixAt(p.index, _matrix);

			// Opacity interpolation
			opacityData[p.index] =
				config.opacity[0] + (config.opacity[1] - config.opacity[0]) * t;

			dirty = true;

			if (t >= 1) {
				p.active = false;
				// Collapse the instance so it's not rendered
				_scale.setScalar(0);
				_matrix.compose(_pos, _rot, _scale);
				this.mesh.setMatrixAt(p.index, _matrix);
				opacityData[p.index] = 0;
			}
		}

		if (dirty) {
			this.mesh.instanceMatrix.needsUpdate = true;
			this.opacityAttr.needsUpdate = true;
		}
	}
}
