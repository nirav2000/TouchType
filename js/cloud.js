// TouchType local-first cloud snapshots. The existing kk-syllabus owner account controls access.
import {initializeApp,getApps,getApp} from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js';
import {getAuth,onAuthStateChanged,signInWithEmailAndPassword,signOut} from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js';
import {getFirestore,doc,getDoc,setDoc,serverTimestamp} from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js';
const config={apiKey:'AIzaSyDrreK9rhsoOpIYNr4QeNZ7CsXgQiMPW0E',authDomain:'kk-syllabus.firebaseapp.com',projectId:'kk-syllabus',storageBucket:'kk-syllabus.firebasestorage.app',messagingSenderId:'821660665663',appId:'1:821660665663:web:c708860329bb97dc24758a'};
const app=getApps().find(a=>a.name==='touchtype-cloud')||initializeApp(config,'touchtype-cloud');
const auth=getAuth(app),db=getFirestore(app),OWNER='2AJSfYdtg5URWHv7HCzpNMmKIlg2';
let pending=false,busy=false,remoteReady=false,authReady=false;
const banner=document.createElement('div');banner.id='cloud-status';banner.style.cssText='position:fixed;bottom:12px;right:12px;z-index:999;padding:9px 13px;border-radius:12px;background:#233a44;color:#fff;font:13px system-ui;max-width:300px';
document.body.append(banner);
const status=s=>banner.textContent='Cloud: '+s;
status('sign in to sync');
const getLocal=()=>KQ.store.data;
const learnerId=p=>'tt_'+p.id.replace(/[^A-Za-z0-9_-]/g,'_');
const learnerDoc=p=>doc(db,'touchtype_learners',learnerId(p));
const membershipDoc=(uid,p)=>doc(db,'touchtype_memberships',uid+'_'+learnerId(p));
function merge(local,remote){
 const profiles=new Map((remote.profiles||[]).map(p=>[p.id,p]));
 for(const p of local.profiles||[]){const old=profiles.get(p.id);if(!old){profiles.set(p.id,p);continue;}
  // Never discard checkpoint records during migration or concurrent-device reconciliation.
  const combine=(a=[],b=[])=>{const rows=new Map();for(const r of [...b,...a])rows.set(r.id||[r.date,r.benchmarkId,r.wpm,r.accuracy,r.method].join(':'),r);return [...rows.values()].sort((x,y)=>String(y.date).localeCompare(String(x.date)));};
  profiles.set(p.id,{...old,...p,benchmarkRecords:combine(p.benchmarkRecords,old.benchmarkRecords),drillRecords:combine(p.drillRecords,old.drillRecords),history:combine(p.history,old.history)});
 }
 return {profiles:[...profiles.values()],currentId:local.currentId||remote.currentId||null};
}
async function sync(){if(busy||!auth.currentUser||auth.currentUser.uid!==OWNER){pending=true;return;}busy=true;
 try{const ref=doc(db,'touchtype_users',OWNER);const snap=await getDoc(ref);const local=getLocal();const merged=merge(local,snap.exists()?snap.data():{profiles:[]});
 KQ.store.data=merged;const original=KQ.store.save;KQ.store.save=function(){try{localStorage.setItem('touchtype:v1',JSON.stringify(merged))}catch(e){status('local storage unavailable')}};KQ.store.save();KQ.store.save=original;
 await setDoc(ref,{app:'touchtype',schemaVersion:1,updatedAt:serverTimestamp(),profiles:merged.profiles,currentId:merged.currentId});pending=false;remoteReady=true;status('synced');
 }catch(e){pending=true;status('sync failed: '+e.message)}finally{busy=false;}}
// Wrap the existing save method; never replace the app's local-first persistence.
const originalSave=KQ.store.save.bind(KQ.store);
KQ.store.save=function(){originalSave();pending=true;clearTimeout(KQ.store._cloudTimer);KQ.store._cloudTimer=setTimeout(sync,1600)};
onAuthStateChanged(auth,user=>{if(user?.uid===OWNER){KQ.store.switchAccount(user.uid);status('syncing');sync()}else{KQ.store.switchAccount(user?.uid||null);status(user?'Cloud access pending':'Sign in to sync')}window.dispatchEvent(new Event('touchtype:workspace-changed'))});
window.TouchTypeCloud={signIn:(email,password)=>signInWithEmailAndPassword(auth,email,password),signOut:()=>signOut(auth),sync,auth};
const panel=document.createElement('div');panel.style.cssText='position:fixed;bottom:54px;right:12px;z-index:998';panel.innerHTML='<button id="touchtype-cloud-login" style="padding:8px 12px;border-radius:9px">Cloud account</button>';document.body.append(panel);
panel.querySelector('button').onclick=async()=>{if(auth.currentUser){await sync();return;}const email=prompt('kk-syllabus account email');if(!email)return;const password=prompt('Password');if(!password)return;try{await signInWithEmailAndPassword(auth,email,password)}catch(e){status('sign-in failed: '+e.code)}};
