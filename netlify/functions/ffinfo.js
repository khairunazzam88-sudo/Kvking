/* ============================================================
   KV KING — perantara data akun Free Fire
   Berkas ini berjalan di server Netlify, bukan di HP pengunjung.
   Gunanya dua: menyembunyikan kunci API, dan menghindari
   pemblokiran CORS karena alamatnya jadi satu domain dengan situs.

   Cara memasang kunci API:
     Netlify > Site configuration > Environment variables
       FREEFIRE_API_KEY = kunci-rahasiamu

   Kuncinya hanya dipakai di sini, tidak pernah dikirim ke pengunjung
   dan tidak pernah ikut tercetak di pesan kesalahan.
   ============================================================ */

"use strict";

/* Satu-satunya penyedia. uid, region, dan kunci dikirim sebagai
   parameter alamat; nama parameter kuncinya "key". */
var PENYEDIA = "https://siambhau69.eu.cc/freefireinfo/bhau";

var WILAYAH = ["IND","BR","SG","RU","ID","TW","US","VN","TH","ME","PK","CIS","BD"];

var BATAS_WAKTU = 12000; /* 12 detik, Netlify memutus di 10-26 detik */

function ambilDalam(obj, jalur){
  /* jalur ditulis "a.b.c"; balikkan undefined kalau salah satu simpul kosong */
  var bagian = jalur.split(".");
  var kini = obj;
  for(var i = 0; i < bagian.length; i++){
    if(kini === null || typeof kini !== "object") return undefined;
    kini = kini[bagian[i]];
  }
  return kini;
}

function cari(obj, daftarJalur){
  for(var i = 0; i < daftarJalur.length; i++){
    var n = ambilDalam(obj, daftarJalur[i]);
    if(n !== undefined && n !== null && n !== "") return n;
  }
  return undefined;
}

function keAngka(n){
  if(n === undefined || n === null || n === "") return null;
  var a = Number(n);
  return isFinite(a) ? a : null;
}

/* Daftar id item: buang yang bukan angka wajar dan yang kembar.
   Balikkan array kosong kalau tidak ada yang tersisa - bukan null,
   supaya sisi tampilan tidak perlu memeriksa dua bentuk. */
function daftarAngka(n){
  if(!Array.isArray(n)) return [];
  var out = [];
  for(var i = 0; i < n.length; i++){
    var a = keAngka(n[i]);
    if(a === null || a <= 0) continue;
    if(out.indexOf(a) === -1) out.push(a);
  }
  return out;
}

function keDetik(n){
  /* balasan API kadang detik, kadang milidetik; samakan ke detik */
  var a = keAngka(n);
  if(a === null || a <= 0) return null;
  if(a > 1e12) a = Math.floor(a / 1000);
  return a;
}

/* Beberapa penyedia membungkus isinya di dalam "data" atau "result".
   Kupas dulu supaya pembaca di bawah tidak perlu tahu bungkusnya. */
function kupas(j){
  if(!j || typeof j !== "object") return j;
  if(j.basicInfo) return j;
  if(j.data && typeof j.data === "object") return kupas(j.data);
  if(j.result && typeof j.result === "object") return kupas(j.result);
  if(j.account && typeof j.account === "object") return kupas(j.account);
  return j;
}

function bacaBooyahPass(j){
  var riwayat = j.historyEpInfo || j.HistoryEpInfo;
  if(!Array.isArray(riwayat) || riwayat.length === 0) return { punya:null, musim:null };
  /* musim paling baru = epEventId terbesar */
  var teratas = null;
  for(var i = 0; i < riwayat.length; i++){
    var e = riwayat[i];
    if(!e || typeof e !== "object") continue;
    if(teratas === null || keAngka(e.epEventId) > keAngka(teratas.epEventId)) teratas = e;
  }
  if(!teratas) return { punya:null, musim:null };
  return {
    punya: teratas.ownedPass === true,
    musim: keAngka(teratas.epEventId),
    lencana: keAngka(teratas.badgeCnt)
  };
}

function rapikan(mentah){
  var j = kupas(mentah);
  if(!j || typeof j !== "object") return null;

  var nama = cari(j, ["basicInfo.nickname","nickname","name","basicInfo.name"]);
  if(nama === undefined) return null; /* tanpa nama, anggap bukan balasan yang sah */

  var bp = bacaBooyahPass(j);

  return {
    uid:        String(cari(j, ["basicInfo.accountId","accountId","uid"]) || ""),
    nama:       String(nama),
    wilayah:    String(cari(j, ["basicInfo.region","region"]) || ""),
    level:      keAngka(cari(j, ["basicInfo.level","level"])),
    exp:        keAngka(cari(j, ["basicInfo.exp","exp"])),
    like:       keAngka(cari(j, ["basicInfo.liked","liked","likes"])),
    dibuat:     keDetik(cari(j, ["basicInfo.createAt","createAt","createdAt"])),
    login:      keDetik(cari(j, ["basicInfo.lastLoginAt","lastLoginAt"])),
    lencana:    keAngka(cari(j, ["basicInfo.badgeCnt","badgeCnt"])),
    rankBr:     keAngka(cari(j, ["basicInfo.rank"])),
    poinBr:     keAngka(cari(j, ["basicInfo.rankingPoints"])),
    rankCs:     keAngka(cari(j, ["basicInfo.csRank"])),
    poinCs:     keAngka(cari(j, ["basicInfo.csRankingPoints"])),
    bio:        (cari(j, ["socialInfo.signature","signature"]) || "") + "",
    kredit:     keAngka(cari(j, ["creditScoreInfo.creditScore","creditScore"])),
    diamond:    keAngka(cari(j, ["diamondCostRes.diamondCost","diamondCost"])),
    bpPunya:    bp.punya,
    bpMusim:    bp.musim,
    petNama:    cari(j, ["petInfo.name"]) || null,
    petLevel:   keAngka(cari(j, ["petInfo.level"])),
    /* --- id barang yang dipakai. Semuanya angka umum, bukan data rahasia.
       Yang tidak ada di balasan tetap null / array kosong. --- */
    primeLevel: keAngka(cari(j, ["basicInfo.primeInfo.primeLevel"])),
    avatarId:   keAngka(cari(j, ["profileInfo.avatarId"])),
    headPic:    keAngka(cari(j, ["basicInfo.headPic"])),
    bannerId:   keAngka(cari(j, ["basicInfo.bannerId"])),
    titleId:    keAngka(cari(j, ["basicInfo.title"])),
    badgeId:    keAngka(cari(j, ["basicInfo.badgeId"])),
    pinId:      keAngka(cari(j, ["basicInfo.pinId"])),
    tasId:      keAngka(cari(j, ["basicInfo.gameBagShow"])),
    /* hasElitePass = Booyah Pass premium (Elite Pass nama lamanya).
       Muncul hanya kalau bernilai true; kalau tidak ada, akunnya memakai
       Booyah Pass gratis. Dibaca lewat ambilDalam, bukan cari(), supaya
       nilai false tetap terbaca sebagai false dan bukan dianggap kosong. */
    bpPremium:  ambilDalam(j, "basicInfo.hasElitePass") === true,
    petId:      keAngka(cari(j, ["petInfo.id"])),
    petSkinId:  keAngka(cari(j, ["petInfo.skinId"])),
    baju:       daftarAngka(ambilDalam(j, "profileInfo.clothes")),
    senjata:    daftarAngka(ambilDalam(j, "basicInfo.weaponSkinShows")),
    maxRankBr:  keAngka(cari(j, ["basicInfo.maxRank"])),
    maxRankCs:  keAngka(cari(j, ["basicInfo.csMaxRank"])),
    musim:      keAngka(cari(j, ["basicInfo.seasonId"])),
    klanNama:   cari(j, ["clanBasicInfo.clanName","guildName"]) || null,
    klanLevel:  keAngka(cari(j, ["clanBasicInfo.clanLevel"])),
    klanIsi:    keAngka(cari(j, ["clanBasicInfo.memberNum"])),
    klanMuat:   keAngka(cari(j, ["clanBasicInfo.capacity"])),
    klanId:     cari(j, ["clanBasicInfo.clanId"]) || null
  };
}

function susunAlamat(uid, wilayah, kunci){
  var t = new URL(PENYEDIA);
  t.searchParams.set("uid", uid);
  t.searchParams.set("region", wilayah);
  t.searchParams.set("key", kunci);
  return t.toString();
}

async function panggil(alamat){
  var pemutus = new AbortController();
  var jam = setTimeout(function(){ pemutus.abort(); }, BATAS_WAKTU);
  try{
    var balas = await fetch(alamat, {
      method: "GET",
      headers: { "accept": "application/json" },
      signal: pemutus.signal
    });
    var teks = await balas.text();
    if(!balas.ok) return { gagal: "Penyedia membalas " + balas.status };
    var j;
    try{ j = JSON.parse(teks); }
    catch(e){ return { gagal: "Balasan penyedia bukan JSON" }; }
    var rapi = rapikan(j);
    if(!rapi) return { gagal: "Data akun tidak ditemukan", mentah: j };
    return { data: rapi, mentah: j };
  }catch(e){
    return { gagal: e.name === "AbortError" ? "Penyedia tidak menjawab" : "Gagal menghubungi penyedia" };
  }finally{
    clearTimeout(jam);
  }
}

/* Jaring pengaman untuk mode pemeriksaan: kalau penyedia sampai memantulkan
   kembali alamat permintaan (lengkap dengan kuncinya) di dalam balasannya,
   kuncinya dicoret sebelum apa pun dikirim ke browser. */
function sensor(obj, kunci){
  var t = JSON.stringify(obj);
  if(t === undefined) return null;
  /* split/join sekali jalan: aman walau kuncinya kosong, dan tidak bisa
     berputar tanpa henti seperti replace() berulang */
  if(kunci) t = t.split(kunci).join("[disensor]");
  try{ return JSON.parse(t); }catch(e){ return null; }
}

function balasan(kode, isi){
  return {
    statusCode: kode,
    headers: {
      "content-type": "application/json; charset=utf-8",
      /* ditembolokkan sebentar supaya UID yang sama tidak memukul
         penyedia berulang kali */
      "cache-control": kode === 200 ? "public, max-age=120" : "no-store"
    },
    body: JSON.stringify(isi)
  };
}

exports.handler = async function(event){
  var q = (event && event.queryStringParameters) || {};
  var uid = String(q.uid || "").trim();
  var wilayah = String(q.region || "ID").trim().toUpperCase();

  if(!/^[0-9]{6,14}$/.test(uid)){
    return balasan(400, { ok:false, pesan:"UID harus angka, 6 sampai 14 digit." });
  }
  if(WILAYAH.indexOf(wilayah) === -1) wilayah = "ID";

  var kunci = String(process.env.FREEFIRE_API_KEY || "").trim();
  if(!kunci){
    return balasan(500, {
      ok: false,
      pesan: "Kunci API belum dipasang di server.",
      petunjuk: "Isi FREEFIRE_API_KEY di Netlify > Site configuration > Environment variables."
    });
  }

  var hasil = await panggil(susunAlamat(uid, wilayah, kunci));

  /* Mode pemeriksaan: ?mentah=1 membalikkan balasan asli penyedia apa adanya
     supaya bentuk datanya bisa dilihat. Kunci API tidak pernah ikut. */
  if(String(q.mentah || "") === "1" && hasil.mentah !== undefined){
    return balasan(200, { ok:true, mentah: sensor(hasil.mentah, kunci) });
  }

  if(hasil.data) return balasan(200, { ok:true, akun:hasil.data });

  return balasan(502, {
    ok: false,
    pesan: hasil.gagal || "Penyedia data sedang tidak bisa dihubungi.",
    petunjuk: "Coba lagi sebentar lagi, atau pastikan UID dan servernya benar."
  });
};
