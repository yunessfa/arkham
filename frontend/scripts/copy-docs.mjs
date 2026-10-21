import {mkdirSync,copyFileSync,writeFileSync} from 'node:fs';
mkdirSync('public/docs',{recursive:true});
for (const n of ['swagger-ui-bundle.js','swagger-ui.css','LICENSE'])copyFileSync('node_modules/swagger-ui-dist/'+n,'public/docs/'+n);
writeFileSync('public/docs/init.js',`window.onload=()=>SwaggerUIBundle({url:'/api/v1/schema/?format=json',dom_id:'#swagger-ui',deepLinking:true,persistAuthorization:false,requestInterceptor:r=>{r.headers['X-CSRFToken']=document.cookie.split('; ').find(s=>s.startsWith('csrftoken='))?.split('=')[1]||'';return r;}});`);
