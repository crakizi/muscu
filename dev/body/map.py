# MUSCLES id de l'app -> muscles BodyParts3D (sans "left/right")
MAP = {
 "delt_ant":["clavicular part of {s} deltoid"],
 "delt_lat":["acromial part of {s} deltoid"],
 "delt_post":["spinal part of {s} deltoid"],
 "rot_cuff":["{s} infraspinatus muscle","{s} teres minor","{s} supraspinatus","{s} subscapularis"],
 "pec_up":["clavicular part of {s} pectoralis major"],
 "pec_mid":["sternocostal part of {s} pectoralis major","abdominal part of {s} pectoralis major"],
 "biceps_long":["long head of {s} biceps brachii"],
 "biceps_short":["short head of {s} biceps brachii"],
 "brachialis":["{s} brachialis"],
 "brachioradialis":["{s} brachioradialis"],
 "forearm":["{s} flexor carpi radialis","{s} palmaris longus","humeral head of {s} flexor carpi ulnaris","ulnar head of {s} flexor carpi ulnaris","humeroulnar head of {s} flexor digitorum superficialis","radial head of {s} flexor digitorum superficialis","{s} flexor digitorum profundus","{s} flexor pollicis longus","humeral head of {s} pronator teres","ulnar head of {s} pronator teres"],
 "triceps_long":["long head of {s} triceps brachii"],
 "triceps_latmed":["lateral head of {s} triceps brachii","medial head of {s} triceps brachii"],
 "lats":["{s} latissimus dorsi"],
 "teres":["{s} teres major"],
 "traps_up":["descending part of {s} trapezius"],
 "traps_mid":["transverse part of {s} trapezius","{s} rhomboid major","{s} rhomboid minor"],
 "traps_low":["ascending part of {s} trapezius"],
 "erectors":["{s} iliocostalis lumborum","{s} iliocostalis thoracis","{s} longissimus thoracis","{s} spinalis thoracis"],
 "abs":["{s} rectus abdominis"],
 "obliques":["{s} external oblique"],
 "glutes_max":["{s} gluteus maximus"],
 "glutes_med":["{s} gluteus medius"],
 "quads":["{s} rectus femoris","{s} vastus lateralis","{s} vastus medialis","{s} vastus intermedius"],
 "hamstrings":["long head of {s} biceps femoris","short head of {s} biceps femoris","{s} semitendinosus","{s} semimembranosus"],
 "adductors":["{s} adductor longus","{s} adductor magnus","{s} adductor brevis","{s} gracilis","{s} pectineus"],
 "calves":["medial head of {s} gastrocnemius","lateral head of {s} gastrocnemius","{s} soleus"],
}
# muscles visibles « neutres » (pour un écorché complet)
NEUTRAL = ["{s} sternocleidomastoid","{s} serratus anterior","{s} sartorius","{s} tensor fasciae latae","{s} tibialis anterior",
 "{s} fibularis longus","{s} fibularis brevis","{s} extensor digitorum longus","{s} extensor carpi radialis longus","{s} extensor carpi radialis brevis",
 "{s} extensor digitorum","{s} extensor digiti minimi","humeral head of {s} extensor carpi ulnaris","{s} splenius capitis","{s} levator scapulae",
 "{s} coracobrachialis","{s} internal oblique","{s} iliotibial tract","{s} gluteus minimus","{s} extensor pollicis brevis","{s} extensor pollicis longus",
 "{s} flexor digitorum longus","{s} tibialis posterior","{s} flexor hallucis longus","{s} extensor hallucis longus","{s} platysma"]
BONES = ["{s} clavicle","{s} scapula","{s} humerus","{s} radius","{s} ulna","{s} hip bone","{s} femur","{s} tibia","{s} fibula","mandible","sacrum","body of sternum"] + \
 [f"{s} {n} rib" for n in ["first","second","third","fourth","fifth","sixth","seventh","eighth","ninth","tenth","eleventh","twelfth"] for s in ["{s}"]]
