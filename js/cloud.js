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
 const accountAtStart=auth.currentUser.uid;
 try{const ref=doc(db,'touchtype_users',OWNER);const snap=await getDoc(ref);if(auth.currentUser?.uid!==accountAtStart)return;
 const local=getLocal();const merged=merge(local,snap.exists()?snap.data():{profiles:[]});
 if(auth.currentUser?.uid!==accountAtStart)return;
 KQ.store.acceptCloudData(merged);
 await setDoc(ref,{app:'touchtype',schemaVersion:1,updatedAt:serverTimestamp(),profiles:merged.profiles,currentId:merged.currentId});
 for(const profile of merged.profiles){
  const access=membershipDoc(OWNER,profile);
  await setDoc(access,{uid:OWNER,learnerId:learnerId(profile),role:'parent',createdAt:serverTimestamp()},{merge:true});
  await setDoc(learnerDoc(profile),{learnerId:learnerId(profile),ownerUid:OWNER,profile,updatedAt:serverTimestamp()},{merge:true});
 }
 pending=false;remoteReady=true;status('synced');
 }catch(e){pending=true;status('sync failed: '+e.message)}finally{busy=false;}}
// Wrap the existing save method; never replace the app's local-first persistence.
const originalSave=KQ.store.save.bind(KQ.store);
KQ.store.save=function(){originalSave();if(!auth.currentUser||auth.currentUser.uid!==OWNER)return;pending=true;clearTimeout(KQ.store._cloudTimer);KQ.store._cloudTimer=setTimeout(sync,1600)};
onAuthStateChanged(auth,user=>{if(user?.uid===OWNER){KQ.store.switchAccount(user.uid);status('syncing');sync()}else{KQ.store.switchAccount(user?.uid||null);status(user?'Cloud access pending':'Sign in to sync')}window.dispatchEvent(new Event('touchtype:workspace-changed'))});
import('https://nirav2000.github.io/Apps/auth/v1/index.js').then(async ({Auth})=>{
  await Auth.init({appId:'touchtype',mode:'shadow',appAdapter:{
    init({setAppIdentity}){onAuthStateChanged(auth,user=>setAppIdentity(user,{roles:user?.uid===OWNER?['parent']:[]}));return {user:auth.currentUser,roles:auth.currentUser?.uid===OWNER?['parent']:[]}},
    getIdToken(){return auth.currentUser?.getIdToken()},
    onChange(handler){return onAuthStateChanged(auth,user=>handler(user,user?.uid===OWNER?['parent']:[]))},
    logout(){return signOut(auth)}
  }});
  window.TouchTypeSharedAuth=Auth;
}).catch(e=>status('Shared Auth unavailable: '+e.message));
window.TouchTypeCloud={signIn:(email,password)=>signInWithEmailAndPassword(auth,email,password),signOut:()=>signOut(auth),sync,auth};
const panel=document.createElement('div');
panel.style.cssText='position:fixed;bottom:56px;right:12px;z-index:998';
const open=document.createElement('button');open.id='touchtype-cloud-login';open.textContent='Account & sync';
open.style.cssText='padding:10px 15px;border-radius:12px;cursor:pointer';panel.append(open);document.body.append(panel);
const dialog=document.createElement('dialog');dialog.style.cssText='border:0;border-radius:22px;padding:18px;max-width:min(94vw,500px);width:100%;background:#fff;color:#172235';
const head=document.createElement('div');head.style.cssText='display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:12px';
const title=document.createElement('strong');title.textContent='Your TouchType account';
const close=document.createElement('button');close.textContent='Close';close.onclick=()=>dialog.close();head.append(title,close);dialog.append(head);
const authMount=document.createElement('div');dialog.append(authMount);
const legacyForm=document.createElement('form');legacyForm.style.cssText='display:grid;gap:10px;margin-top:12px';
const email=document.createElement('input');email.type='email';email.placeholder='Email address';email.autocomplete='email';email.required=true;
const password=document.createElement('input');password.type='password';password.placeholder='Password';password.autocomplete='current-password';password.required=true;
const submit=document.createElement('button');submit.type='submit';submit.textContent='Sign in';legacyForm.append(email,password,submit);
const signOutButton=document.createElement('button');signOutButton.textContent='Sign out';signOutButton.onclick=()=>signOut(auth);
const syncButton=document.createElement('button');syncButton.textContent='Sync now';syncButton.onclick=sync;
const importButton=document.createElement('button');importButton.textContent='Import local profiles into my account';
importButton.onclick=()=>{if(auth.currentUser?.uid!==OWNER)return status('Import needs owner approval');
 const guest=JSON.parse(localStorage.getItem('touchtype:v1')||'{"profiles":[]}');
 if(!guest.profiles?.length)return status('No local profiles to import');
 if(!confirm('Copy '+guest.profiles.length+' local profiles into your signed-in account? The originals will remain on this device.'))return;
 KQ.store.acceptCloudData(merge(KQ.store.data,guest));sync();
};
const actions=document.createElement('div');actions.style.cssText='display:flex;gap:8px;flex-wrap:wrap;margin-top:12px';actions.append(syncButton,signOutButton,importButton);dialog.append(legacyForm,actions);document.body.append(dialog);
legacyForm.onsubmit=async e=>{e.preventDefault();submit.disabled=true;try{await signInWithEmailAndPassword(auth,email.value,password.value);password.value=''}catch(err){status('Sign-in failed: '+(err.code||err.message))}finally{submit.disabled=false}};
open.onclick=async()=>{if(window.TouchTypeSharedAuth){
 try{await import('https://nirav2000.github.io/Apps/auth/v1/ui.js');
  if(!authMount.firstElementChild){const el=document.createElement('apps-auth-panel');el.setAttribute('variant','balanced');el.setAttribute('theme','playful');el.setAttribute('methods','emailPassword');authMount.append(el)}
  legacyForm.hidden=true;
 }catch(err){legacyForm.hidden=false;status('Shared account UI unavailable')}
 }else legacyForm.hidden=false;
 dialog.showModal()};
onAuthStateChanged(auth,user=>{signOutButton.hidden=!user;syncButton.hidden=!user;importButton.hidden=user?.uid!==OWNER;legacyForm.hidden=!!user||!!window.TouchTypeSharedAuth});
