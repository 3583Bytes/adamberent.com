import { useFrame, type ThreeEvent } from '@react-three/fiber'
import { useRef, useState, type ReactNode } from 'react'
import * as THREE from 'three'
import { getState, setState, useStore } from '../store'

type Props = {
  name: string
  title: string
  blurb: string
  url: string
  position?: [number, number, number]
  rotation?: [number, number, number]
  lift?: number
  onHoverChange?: (hovered: boolean) => void
  children: ReactNode
}

function countTriangles(root: THREE.Object3D) {
  let triangles = 0
  let meshes = 0
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh
    if (!mesh.isMesh || mesh.userData.helper) return
    meshes++
    const geo = mesh.geometry
    const perInstance = (geo.index ? geo.index.count : geo.attributes.position.count) / 3
    const instances = (mesh as THREE.InstancedMesh).isInstancedMesh ? (mesh as THREE.InstancedMesh).count : 1
    triangles += perInstance * instances
  })
  return { triangles: Math.round(triangles), meshes }
}

// Wraps a scene object: lifts on hover, shows a tooltip, opens its link on click,
// and in the console's inspect mode reports stats instead of navigating.
export function Interactive({ name, title, blurb, url, position, rotation, lift = 0.08, onHoverChange, children }: Props) {
  const inner = useRef<THREE.Group>(null)
  const [hot, setHot] = useState(false)
  const [box, setBox] = useState<{ size: THREE.Vector3; center: THREE.Vector3 } | null>(null)
  const selected = useStore((s) => s.inspected?.name === name)

  useFrame((_, dt) => {
    if (!inner.current) return
    const target = hot ? lift : 0
    inner.current.position.y = THREE.MathUtils.damp(inner.current.position.y, target, 12, dt)
  })

  const hover = (on: boolean) => {
    setHot(on)
    onHoverChange?.(on)
    document.body.style.cursor = on ? 'pointer' : ''
    if (on) setState({ hovered: { title, blurb, url } })
    else if (getState().hovered?.title === title) setState({ hovered: null })
  }

  const click = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    // Ignore clicks that were really a drag to look around.
    if (e.delta > 8) return
    if (!getState().inspectMode) {
      window.open(url, '_blank', 'noopener')
      return
    }
    const group = inner.current!
    group.updateWorldMatrix(true, true)
    // Bounding box in the group's local space, for the selection outline.
    const local = new THREE.Box3()
    const inv = group.matrixWorld.clone().invert()
    group.traverse((obj) => {
      const mesh = obj as THREE.Mesh
      if (!mesh.isMesh || mesh.userData.helper) return
      mesh.geometry.computeBoundingBox()
      // One combined transform; two separate ones would inflate the box twice.
      const toLocal = inv.clone().multiply(mesh.matrixWorld)
      const b = mesh.geometry.boundingBox!.clone().applyMatrix4(toLocal)
      local.union(b)
    })
    setBox({ size: local.getSize(new THREE.Vector3()), center: local.getCenter(new THREE.Vector3()) })
    const p = group.getWorldPosition(new THREE.Vector3())
    setState({ inspected: { name, position: [p.x, p.y, p.z], ...countTriangles(group) } })
  }

  return (
    <group position={position} rotation={rotation}>
      <group
        ref={inner}
        name={name}
        onPointerOver={(e) => {
          e.stopPropagation()
          hover(true)
        }}
        onPointerOut={() => hover(false)}
        onClick={click}
      >
        {children}
        {selected && box && (
          <mesh position={box.center} userData={{ helper: true }} renderOrder={10}>
            <boxGeometry args={[box.size.x * 1.06, box.size.y * 1.06, box.size.z * 1.06]} />
            <meshBasicMaterial color="#41f0a0" wireframe depthTest={false} transparent opacity={0.9} toneMapped={false} />
          </mesh>
        )}
      </group>
    </group>
  )
}
