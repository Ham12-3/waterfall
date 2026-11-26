# Realism pass, trees. The Poly Haven tree scans are 1 to 2 million triangles
# each, so each is rendered from the front and the side into transparent
# images, and the game shows those on two crossed cards (4 triangles a tree).
import sys

sys.path.insert(0, r"C:\Users\mobol\Downloads\waterfall\assets-src\blender")
import importlib
import math
import os
import random

import bmesh
import cascade_lib as L

importlib.reload(L)
import bpy
from mathutils import Vector

RAW = os.path.join(L.ROOT, "assets-src", "raw")
SIZE = 1024
TREES = {"Tree_A": "tree_small_02_LOD0", "Tree_B": "island_tree_02_LOD0"}

level = bpy.data.scenes["Scene"]
source = bpy.data.scenes["Foliage_Source"]

# ---- A throwaway scene to render in.
old = bpy.data.scenes.get("Impostor_Render")
if old:
    bpy.data.scenes.remove(old)
render = bpy.data.scenes.new("Impostor_Render")
render.world = level.world  # the HDRI gives soft, even light with no hard sun
render.render.engine = "BLENDER_EEVEE"
render.render.film_transparent = True
render.render.resolution_x = render.render.resolution_y = SIZE
render.render.resolution_percentage = 100
render.render.image_settings.file_format = "PNG"
render.render.image_settings.color_mode = "RGBA"
render.view_settings.view_transform = "Standard"
cam_data = bpy.data.cameras.new("Impostor_Cam")
cam_data.type = "ORTHO"
cam = bpy.data.objects.new("Impostor_Cam", cam_data)
render.collection.objects.link(cam)
render.camera = cam
bpy.context.window.scene = render

impostors = {}
for name, src_name in TREES.items():
    tree = source.objects[src_name]
    render.collection.objects.link(tree)
    corners = [tree.matrix_world @ Vector(c) for c in tree.bound_box]
    lo = Vector((min(c.x for c in corners), min(c.y for c in corners), min(c.z for c in corners)))
    hi = Vector((max(c.x for c in corners), max(c.y for c in corners), max(c.z for c in corners)))
    span = max(hi.x - lo.x, hi.y - lo.y, hi.z - lo.z) * 1.04
    origin = tree.matrix_world.translation
    cam_data.ortho_scale = span
    cam_data.clip_end = 200
    # Trunk centred, base on the bottom edge of the frame.
    centre_z = lo.z + span / 2
    views = (("front", Vector((origin.x, origin.y - 60, centre_z)), (math.radians(90), 0, 0)),
             ("side", Vector((origin.x + 60, origin.y, centre_z)), (math.radians(90), 0, math.radians(90))))
    paths = []
    for view, location, rotation in views:
        cam.location = location
        cam.rotation_euler = rotation
        path = os.path.join(RAW, f"{name.lower()}_{view}.png")
        render.render.filepath = path
        bpy.ops.render.render(write_still=True)
        paths.append(path)
    render.collection.objects.unlink(tree)
    impostors[name] = (span, paths)
    print(name, "rendered | span", round(span, 2), "m | source tris", L.tri_count(tree.data))

bpy.context.window.scene = level
bpy.data.scenes.remove(render)
bpy.data.objects.remove(cam, do_unlink=True)


# ---- Crossed-card meshes with the renders as cut-out textures.
def card_material(mat_name, path):
    mat = bpy.data.materials.get(mat_name) or bpy.data.materials.new(mat_name)
    mat.use_nodes = True
    nodes, links = mat.node_tree.nodes, mat.node_tree.links
    nodes.clear()
    out = nodes.new("ShaderNodeOutputMaterial")
    bsdf = nodes.new("ShaderNodeBsdfPrincipled")
    bsdf.inputs["Roughness"].default_value = 0.85
    tex = nodes.new("ShaderNodeTexImage")
    image = bpy.data.images.get(os.path.basename(path))
    if image:
        image.reload()
    else:
        image = bpy.data.images.load(path)
    tex.image = image
    links.new(tex.outputs["Color"], bsdf.inputs["Base Color"])
    links.new(tex.outputs["Alpha"], bsdf.inputs["Alpha"])
    links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])
    return mat


card_meshes = {}
for name, (span, paths) in impostors.items():
    bm = bmesh.new()
    uv = bm.loops.layers.uv.new("UVMap")
    half = 0.5  # a 1 m card; instances are scaled to tree height
    for index, axis in enumerate(((1, 0), (0, 1))):
        ax, ay = axis
        quad = [bm.verts.new((-half * ax, -half * ay, 0)), bm.verts.new((half * ax, half * ay, 0)),
                bm.verts.new((half * ax, half * ay, 1)), bm.verts.new((-half * ax, -half * ay, 1))]
        face = bm.faces.new(quad)
        face.material_index = index
        for loop, st in zip(face.loops, ((0, 0), (1, 0), (1, 1), (0, 1))):
            loop[uv].uv = st
    mesh = L.mesh_from_bmesh("Card_" + name, bm, smooth=False)
    mesh.materials.append(card_material(f"M_{name}_Front", paths[0]))
    mesh.materials.append(card_material(f"M_{name}_Side", paths[1]))
    card_meshes[name] = mesh

# ---- Plant them: along the cliff top, behind the banks and down the outer shore.
old = bpy.data.collections.get("Trees")
if old:
    for obj in list(old.objects):
        bpy.data.objects.remove(obj, do_unlink=True)
rng = random.Random(5)
cliff_top = L.BLOCKS["Cliff_Main"]["position"][1] + L.BLOCKS["Cliff_Main"]["size"][1] / 2
count = 0


def tree(x, y, z, height):
    global count
    count += 1
    obj = L.new_object(f"Tree_{count:02d}", card_meshes[rng.choice(list(card_meshes))], "Trees", L.g(x, y - 0.25, z))
    obj.scale = (height, height, height)
    obj.rotation_euler = (0, 0, rng.uniform(0, math.tau))


for side in (-1, 1):
    for _ in range(5):
        tree(side * rng.uniform(7.5, 19), cliff_top, rng.uniform(-8.6, -5.0), rng.uniform(7, 11))
    for _ in range(3):
        tree(side * rng.uniform(17.2, 19.6), 0, rng.uniform(-2.2, 3.2), rng.uniform(9, 13))
    for _ in range(4):
        tree(side * rng.uniform(17.5, 19.6), 0, rng.uniform(5.5, 19), rng.uniform(9, 14))

L.set_view((0, 8, 2), 52, pitch_deg=74, yaw_deg=16)
print("trees planted:", count, "| triangles each: 4")
print("saved:", L.save())
