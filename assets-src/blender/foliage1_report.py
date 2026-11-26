import bpy
scene = bpy.data.scenes["Foliage_Source"]
def tris(m): return sum(len(p.vertices) - 2 for p in m.polygons)
for o in scene.objects:
    if o.type == "MESH":
        d = o.dimensions
        mats = [s.material.name for s in o.material_slots if s.material]
        print(f"{o.name}: {tris(o.data)} tris | size {d.x:.2f} x {d.y:.2f} x {d.z:.2f} | parent {o.parent.name if o.parent else None} | mats {mats}")
    else:
        print(o.name, o.type)
imgs = [(i.name, tuple(i.size)) for i in bpy.data.images if i.size[0] and ("fern" in i.name.lower() or "anthurium" in i.name.lower())]
print("images:", imgs)
print("world:", bpy.context.scene.world.name if bpy.context.scene.world else None)
