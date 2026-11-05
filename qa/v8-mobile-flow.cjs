// V8 mobile purchase flow (iPhone 13): drawer, add to cart, filter sheet, cart, OTP login,
// address, coupon, order. Demo server only (SMS_PROVIDER=console). Usage:
//   BASE=http://127.0.0.1:8000 OUT=qa/reports node qa/v8-mobile-flow.cjs [golden_gallery|noir_hive]
const {chromium,devices}=require('playwright');
const theme=process.argv[2]||'golden_gallery';
(async()=>{
 const b=await chromium.launch();
 const ctx=await b.newContext({...devices['iPhone 13'],deviceScaleFactor:1,locale:'fa-IR'});
 await ctx.addInitScript(t=>{try{localStorage.setItem('arkham-theme',t)}catch(e){}},theme);
 const p=await ctx.newPage();
 p.on('pageerror',e=>console.log('PAGEERROR',e.message));
 p.on('console',m=>{if(m.type()==='error')console.log('CONSOLE',m.text())});
 const shot=async n=>{await p.waitForTimeout(700);await p.screenshot({path:require('path').join(process.env.OUT||'.',`flow_${n}.png`)});console.log('shot',n)};
 await p.goto((process.env.BASE||'http://127.0.0.1:8000')+'/',{waitUntil:'networkidle'});
 await p.waitForTimeout(300); await shot('0boot');
 await p.waitForTimeout(1200);
 await p.click('.header-menu'); await shot('1drawer');
 await p.click('.drawer-links a[href="/products"]'); await p.waitForTimeout(1200);
 await p.locator('.shop-card .add-button').first().click(); await p.waitForTimeout(250); await shot('2added');
 await p.locator('.shop-card .add-button').nth(2).click(); await p.waitForTimeout(800);
 await p.click('.filter-button'); await shot('3sheet');
 await p.keyboard.press('Escape');
 await p.goto((process.env.BASE||'http://127.0.0.1:8000')+'/cart',{waitUntil:'networkidle'}); await shot('4cart');
 await p.click('.flow-dock .gold'); await p.waitForTimeout(1200); await shot('5checkout-guest');
 await p.fill('.otp input[type=tel]','0912'+String(Math.floor(1e6+Math.random()*8e6)).padStart(7,'0')); await p.click('.otp .gold'); await p.waitForTimeout(1000);
 const code=await p.textContent('.otp .notice b'); await shot('6code');
 await p.fill('.otp-input',code.trim()); await p.waitForTimeout(1500); await shot('7name');
 
 await shot('8address');
 await p.fill('input[name=recipient]','سارا رضایی'); await p.fill('input[name=phone]','۰۹۱۲۳۴۵۶۷۸۹');
 await p.selectOption('select[name=province]','تهران'); await p.fill('input[name=city]','تهران');
 await p.fill('textarea[name=street]','خیابان ولیعصر، کوچه یاس، پلاک ۴'); await p.fill('input[name=postal_code]','۱۲۳۴۵۶۷۸۹۰');
 await p.click('.address-form .gold'); await p.waitForTimeout(1500);
 await p.fill('.coupon input','demo10'); await p.click('.coupon button'); await p.waitForTimeout(1200);
 await p.check('.agree input'); await p.waitForTimeout(500);
 await p.evaluate(()=>scrollTo(0,0)); await shot('9checkout');
 await p.evaluate(()=>scrollTo(0,9999)); await shot('10summary');
 await p.click('.flow-dock .gold'); await p.waitForTimeout(2500); await shot('11order');
 console.log('url',p.url());
 await b.close();
})();
