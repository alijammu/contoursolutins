import {createRequire} from 'node:module';
import fs from 'node:fs/promises';
const require=createRequire('C:/Users/muham/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/package.json');
const {chromium}=require('playwright');
await fs.mkdir('screenshots',{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
const page=await browser.newPage({viewport:{width:1440,height:1000}});
const errors=[], failed=[];
page.on('pageerror',e=>errors.push(e.message));
page.on('response',r=>{if(r.status()>=400)failed.push({url:r.url(),status:r.status()});});
await page.goto('http://localhost:4173/',{waitUntil:'load',timeout:45000});
await page.waitForTimeout(2000);
await page.getByRole('button',{name:'Reject All',exact:true}).first().click().catch(()=>{});
await page.screenshot({path:'screenshots/replica-top.png'});
for(let y=0;y<await page.evaluate(()=>document.body.scrollHeight);y+=700){await page.evaluate(y=>scrollTo(0,y),y);await page.waitForTimeout(180);}
await page.waitForTimeout(1000);
await page.evaluate(()=>scrollTo(0,0));
await page.screenshot({path:'screenshots/replica-desktop.png',clip:{x:0,y:0,width:1440,height:await page.evaluate(()=>document.body.scrollHeight)}});
console.log('DESKTOP',await page.evaluate(()=>({title:document.title,height:document.body.scrollHeight,width:document.documentElement.scrollWidth,viewport:innerWidth,images:[...document.images].filter(i=>!i.complete||i.naturalWidth===0).map(i=>i.src),forms:document.querySelectorAll('form[data-local-form]').length,heading:document.querySelector('h1')?.textContent})));
await page.setViewportSize({width:390,height:844});
await page.screenshot({path:'screenshots/replica-mobile.png',clip:{x:0,y:0,width:390,height:await page.evaluate(()=>document.body.scrollHeight)}});
console.log('MOBILE',await page.evaluate(()=>({width:document.documentElement.scrollWidth,viewport:innerWidth})));
console.log('ERRORS',JSON.stringify(errors));console.log('FAILED',JSON.stringify(failed));
const formCheck=await page.evaluate(async()=>{
 const bad=await fetch('/api/contact',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});
 const good=await fetch('/api/contact',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({page:'/qa-check',fields:{name:'Local QA test',email:'qa@example.test'}})});
 return {invalid:bad.status,valid:good.status};
});
console.log('FORM API',formCheck);
const contact=page.locator('form[data-local-form]').first();
await contact.locator('input:not([type="submit"]):not([type="hidden"]),textarea').evaluateAll(inputs=>inputs.forEach(input=>{input.value=input.type==='email'?'qa@example.test':input.type==='tel'?'1234567890':'Local browser test';input.dispatchEvent(new Event('input',{bubbles:true}));}));
await contact.locator('select').evaluateAll(selects=>selects.forEach(s=>{s.selectedIndex=s.options.length>1?1:0;}));
await contact.locator('[type="submit"]').click();
await page.waitForTimeout(500);
console.log('FORM UI',await contact.locator('[data-local-result]').textContent());
for(const route of ['/pages/company/','/pages/services/','/pages/sectors/','/pages/careers/','/pages/contact-creative/']){
 await page.goto('http://localhost:4173'+route,{waitUntil:'load'});
 console.log('PAGE',route,await page.locator('h1,h2').first().textContent());
}
await fs.writeFile('browser-check.json',JSON.stringify({errors,failed,formCheck},null,2));
if(process.argv.includes('--local-only')){await browser.close();process.exit(0);}
await page.goto('https://htechsupports.com/',{waitUntil:'load',timeout:45000});
await page.setViewportSize({width:1440,height:1000});
await page.waitForTimeout(2500);
await page.getByRole('button',{name:'Reject All',exact:true}).first().click().catch(()=>{});
await page.screenshot({path:'screenshots/reference-top.png'});
await page.screenshot({path:'screenshots/reference-desktop.png',fullPage:true});
await browser.close();
