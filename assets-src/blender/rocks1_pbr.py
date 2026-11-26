# Realism pass, rocks: real PBR rock from Poly Haven on the cliff and ledges,
# scanned boulders in place of the generated ones, plus boulders standing in the
# pool and rock outcrops at the foot and top of the cliff.
import sys

sys.path.insert(0, r"C:\Users\mobol\Downloads\waterfall\assets-src\blender")
import importlib
import math
import random

import cascade_lib as L

importlib.reload(L)
import bpy
from mathutils import Vector

level = bpy.data.scenes["Scene"]
bpy.context.window.scene = level
source = bpy.data.scenes["Foliage_Source"]
M = bpy.data.materials


def variant(name, base):
    """A named copy of a Poly Haven material, so the game can treat each use differently."""
    old = M.get(name)
    if old:
        M.remove(old)
    mat = M[base].copy()
    mat.name = name
    for node in list(mat.node_tree.nodes):
        if node.type == "DISPLACEMENT":
            mat.node_tree.nodes.remove(node)  # glTF has no displacement; the normal map carries the detail
    return mat


cliff_mat = variant("M_Cliff", "mossy_rock")
side_mat = variant("M_Rock_Side", "mossy_rock")
wet_top = variant("M_Rock_WetTop", "lichen_rock")
dry_top = variant("M_Rock_DryTop", "rock_face_03")

# ---- Cliff: new material, and UVs retiled to the texture's real 3 m scale.
cliff = bpy.data.objects["Cliff_Main"]
cliff.data.materials.clear()
cliff.data.materials.append(cliff_mat)
if not cliff.data.get("uv_retiled"):
    for loop in cliff.data.uv_layers.active.data:
        loop.uv *= 1.5
    cliff.data["uv_retiled"] = True

# ---- Ledges, stones, summit, banks: tops by surface type, real rock on the sides.
TOP_SWAP = {"M_Basalt_WetTop": wet_top, "M_Basalt_DryTop": dry_top, "M_Rock_WetTop": wet_top, "M_Rock_DryTop": dry_top}
swapped = 0
for obj in level.objects:
    if obj.type != "MESH" or obj.name.endswith("_COL") or len(obj.material_slots) < 2:
        continue
    if not obj.name.startswith(("Ledge_", "Stone_", "Summit", "Bank_")):
        continue
    top = obj.material_slots[0].material
    if top and top.name in TOP_SWAP:
        obj.material_slots[0].material = TOP_SWAP[top.name]
    obj.material_slots[1].material = side_mat
    swapped += 1


# ---- Reduced copies of the scanned rocks.
def reduced(src_name, new_name, target_tris):
    old = bpy.data.meshes.get(new_name)
    if old:
        return old
    src = source.objects[src_name]
    tmp = src.copy()
    tmp.data = src.data.copy()
    source.collection.objects.link(tmp)
    mod = tmp.modifiers.new("Reduce", "DECIMATE")
    mod.ratio = target_tris / L.tri_count(tmp.data)
    with bpy.context.temp_override(object=tmp, active_object=tmp, selected_objects=[tmp], scene=source):
        bpy.ops.object.modifier_apply(modifier=mod.name)
    mesh = tmp.data
    mesh.name = new_name
    bpy.data.objects.remove(tmp, do_unlink=True)
    mesh.use_fake_user = True
    return mesh


boulder = reduced("boulder_01_LOD0", "Scan_Boulder", 1800)
outcrop = reduced("rock_face_02", "Scan_RockFace", 5200)


def bounds(mesh):
    xs, ys, zs = zip(*(v.co[:] for v in mesh.vertices))
    return Vector((min(xs), min(ys), min(zs))), Vector((max(xs), max(ys), max(zs)))


b_lo, b_hi = bounds(boulder)
b_size = b_hi - b_lo
o_lo, o_hi = bounds(outcrop)
o_size = o_hi - o_lo
print("boulder tris", L.tri_count(boulder), "size", tuple(round(c, 2) for c in b_size), "| outcrop tris", L.tri_count(outcrop), "size", tuple(round(c, 2) for c in o_size))

rng = random.Random(21)


def place_scan(name, mesh, lo, size, x, base_y, z, width, height, yaw, collection="Level"):
    """Stand a scanned rock on the ground at (x, base_y, z), `width` across and `height` tall."""
    obj = L.new_object(name, mesh, collection, (0, 0, 0))
    s_xy = width / max(size.x, size.y)
    s_z = height / size.z
    obj.scale = (s_xy, s_xy, s_z)
    obj.rotation_euler = (0, 0, yaw)
    centre = Vector(((lo.x + size.x / 2) * s_xy, (lo.y + size.y / 2) * s_xy, lo.z * s_z))
    centre.rotate(obj.rotation_euler)
    obj.location = L.g(x, base_y, z) - centre
    return obj


# The six shore boulders keep their colliders; only the visual becomes a scan.
for i in range(1, 7):
    col = bpy.data.objects[f"Boulder_{i:02d}_COL"]
    x, z = col.location.x, -col.location.y
    width, top = max(col.scale.x, col.scale.y) * 1.45, col.scale.z
    place_scan(f"Boulder_{i:02d}", boulder, b_lo, b_size, x, -0.15, z, width, top + 0.3, rng.uniform(0, math.tau))

# Boulders standing in the pool, breaking the surface. (x, z, width, height above the bed)
POOL_ROCKS = [(-9.2, 0.8, 3.0, 2.9), (-11.4, -1.6, 3.6, 3.4), (9.6, 1.2, 2.8, 2.8), (11.6, -1.7, 3.8, 3.6), (7.4, 3.0, 2.2, 2.5), (-7.0, 3.1, 2.4, 2.6)]
bed = L.BLOCKS["Pool_Floor"]["position"][1] + L.BLOCKS["Pool_Floor"]["size"][1] / 2
for i, (x, z, width, height) in enumerate(POOL_ROCKS, start=1):
    name = f"PoolRock_{i:02d}"
    place_scan(name, boulder, b_lo, b_size, x, bed - 0.2, z, width, height, rng.uniform(0, math.tau))
    top = bed - 0.2 + height
    # Standable: a box a little smaller than the rock, flush with its top.
    L.collider({"name": name, "position": [x, (bed + top - 0.15) / 2, z], "size": [width * 0.55, top - 0.15 - bed, width * 0.55], "surface": "wet"})

# Rock outcrops: at the foot of the cliff on both banks, and along its top edge.
cliff_top = L.BLOCKS["Cliff_Main"]["position"][1] + L.BLOCKS["Cliff_Main"]["size"][1] / 2
OUTCROPS = [(-15.5, 0.0, -2.0, 7.5, 5.0, 0.3, True), (15.8, 0.0, -1.8, 8.0, 5.6, 2.9, True), (-11.5, cliff_top - 0.6, -4.4, 6.5, 3.0, 1.2, False), (12.5, cliff_top - 0.6, -4.6, 7.0, 3.4, 4.0, False)]
for i, (x, y, z, width, height, yaw, solid) in enumerate(OUTCROPS, start=1):
    name = f"Outcrop_{i:02d}"
    place_scan(name, outcrop, o_lo, o_size, x, y - 0.3, z, width, height, yaw)
    if solid:
        L.collider({"name": name, "position": [x, y + height * 0.4, z - 0.2], "size": [width * 0.6, height * 0.8, width * 0.42], "surface": "default"})

L.set_view((0, 4, 3), 40, pitch_deg=70, yaw_deg=-20)
print("rocks re-surfaced:", swapped, "| pool rocks:", len(POOL_ROCKS), "| outcrops:", len(OUTCROPS))
print("saved:", L.save())
