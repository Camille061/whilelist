import { world, system} from "@minecraft/server";


world.afterEvents.worldInitialize.subscribe(() => {
    world.sendMessage("§3Script §2Activatee");
});

let monster = ['minecraft:zombie', 'minecraft:creeper', 'minecraft:slime', 'minecraft:spider',
    'minecraft:phantom', 'minecraft:skeleton',
]
// รับบาดเจ็บหนัก
world.afterEvents.entityHurt.subscribe((event) => {

    const player = event.hurtEntity;
    if (player.typeId !== "minecraft:player") return;


    const health = player.getComponent("minecraft:health");
    if (!health) return;

    if (health.currentValue <= 6) {

        player.addEffect("minecraft:slowness", 20 * 1200, { amplifier: 10 }, { showParticles: false });
        world.sendMessage(` ${player.name} §cบาดเจ็บ`)
        player.sendMessage("§cคุณบาดเจ็บ!");



    }
});

world.afterEvents.playerSpawn.subscribe((event) => {
    player.clearEffects();
    player.sendMessage("d")
})



let carrying = new Map(); // คนอุ้ม -> คนโดน
let escapeTimer = new Map(); // คนโดน -> tick ที่เริ่มกดย่อ


world.afterEvents.entityHitEntity.subscribe((event) => {

    const attacker = event.damagingEntity;
    const victim = event.hitEntity;

    if (attacker.typeId !== "minecraft:player") return;
    if (victim.typeId !== "minecraft:player") return;
    if (victim.isSneaking) {
        const player = event.source;
    carrying.delete(player.id);
    }

    if (!attacker.isSneaking) return;

    carrying.set(attacker.id, victim);

    attacker.sendMessage("§aคุณกำลังอุ้ม " + victim.name);
});

system.runInterval(() => {

    for (const [carrierId, target] of carrying) {

        const carrier = world.getAllPlayers().find(p => p.id === carrierId);

        if (!carrier || !target || !carrier.isValid() || !target.isValid()) {
            carrying.delete(carrierId);
            continue;
        }

        const loc = carrier.location;

        // วาร์ปไปตำแหน่งบนหัว
        target.teleport({
            x: loc.x,
            y: loc.y + 1.5,
            z: loc.z
        }, { dimension: carrier.dimension });


        target.addEffect(MinecraftEffectTypes.Slowness, 2, {
            amplifier: 10,
            showParticles: false
        });

        target.addEffect(MinecraftEffectTypes.JumpBoost, 2, {
            amplifier: 250,
            showParticles: false
        });

    }

}, 1);
let tick = 0;

system.runInterval(() => {

    tick++;

    for (const [carrierId, target] of carrying) {

        const carrier = world.getAllPlayers().find(p => p.id === carrierId);

        if (!carrier || !target || !carrier.isValid() || !target.isValid()) {
            carrying.delete(carrierId);
            escapeTimer.delete(target?.id);
            continue;
        }

        // 🎯 ถ้าคนโดนกดย่อ
        if (target.isSneaking) {

            if (!escapeTimer.has(target.id)) {
                escapeTimer.set(target.id, tick);
                target.sendMessage("§eกำลังดิ้น... (3 วิ)");
            }

            const startTick = escapeTimer.get(target.id);

            if (tick - startTick >= 60) { // 60 tick = 3 วิ
                carrier.sendMessage("§cผู้เล่นดิ้นหลุดแล้ว!");
                target.sendMessage("§aคุณดิ้นหลุดสำเร็จ!");

                carrying.delete(carrierId);
                escapeTimer.delete(target.id);
                continue;
            }

        } else {
            // ❌ ถ้าปล่อยปุ่มก่อนครบ 3 วิ รีเซ็ต
            escapeTimer.delete(target.id);
        }

   
    }

}, 1);

let stamina = new Map();
const MAX_STAMINA = 150;

system.runInterval(() => {

    for (const player of world.getAllPlayers()) {

        if (!stamina.has(player.id)) {
            stamina.set(player.id, MAX_STAMINA);
        }

        // 🎨 Creative = ข้ามระบบ
        if (player.getGameMode() === "creative") {
            player.onScreenDisplay.setActionBar("§aพลังงาน: ไม่จำกัด");
            continue;
        }

        let value = stamina.get(player.id);

        // วิ่งลด ไม่วิ่งฟื้น
        if (player.isSprinting) value -= 1;
        else value += 0.5;

        // จำกัดค่า
        if (value > MAX_STAMINA) value = MAX_STAMINA;
        if (value < 0) value = 0;

        stamina.set(player.id, value);

        // หมดแรง
        if (value <= 0) {
            player.addEffect("slowness", 40, {
                amplifier: 3,
                showParticles: false
            });
           
        }

        // สีตามค่า
        let color = "§a";
        if (value <= 50) color = "§c";
        else if (value <= 100) color = "§6";

        // สร้างแถบ
        const barLength = 20;
        const filled = Math.floor((value / MAX_STAMINA) * barLength);
        const empty = barLength - filled;

        const bar =
            color + "|".repeat(filled) +
            "§7" + "|".repeat(empty);

        // แสดงผล
        player.onScreenDisplay.setActionBar(
            `§gพลังงาน §8[${bar}§8] ${color}${Math.floor(value)}`
        );
    }

}, 0.5); 


world.afterEvents.entityDie.subscribe((event) => {

    const dead = event.deadEntity;

    if (dead.typeId === "minecraft:player") {

        world.sendMessage(`§a${dead.name} §cตาย จบโรลย์`);

        dead.runCommandAsync("kick @s จบโรลย์");
    }

});


const badWords = [
    "เหี้ย",
    "ควย",
    "สัส",
    "fuck",
    "shit"
];

world.beforeEvents.chatSend.subscribe((event) => {

    const msg = event.message.toLowerCase();
    const player = event.sender;

    for (const word of badWords) {
        if (msg.includes(word)) {

            event.cancel = true; // ❌ ยกเลิกข้อความ

            player.sendMessage("§cกรุณาอย่าใช้คำหยาบ");

            break;
        }
    }

});
    