from pathlib import Path
root=Path('/data/arkham/backend')
def put(p,s):
 f=root/p; f.parent.mkdir(parents=True,exist_ok=True); f.write_text(s.strip()+'\n')
put('requirements.txt','''Django==5.2.7
djangorestframework==3.16.1
psycopg[binary]==3.2.10
drf-spectacular==0.28.0
Pillow==11.3.0
gunicorn==23.0.0
redis==6.4.0''')
put('manage.py','''#!/usr/bin/env python
import os,sys
os.environ.setdefault('DJANGO_SETTINGS_MODULE','config.settings')
from django.core.management import execute_from_command_line
execute_from_command_line(sys.argv)''')
put('config/__init__.py','')
put('config/settings.py','''import os
from pathlib import Path
from django.core.exceptions import ImproperlyConfigured
BASE_DIR=Path(__file__).resolve().parent.parent
DEBUG=os.getenv('DEBUG','0')=='1'
SECRET_KEY=os.environ.get('SECRET_KEY','')
if not SECRET_KEY: raise ImproperlyConfigured('SECRET_KEY is required')
ALLOWED_HOSTS=os.getenv('ALLOWED_HOSTS','localhost,127.0.0.1,testserver').split(',')
CSRF_TRUSTED_ORIGINS=[s for s in os.getenv('CSRF_TRUSTED_ORIGINS','').split(',') if s]
INSTALLED_APPS=['django.contrib.admin','django.contrib.auth','django.contrib.contenttypes','django.contrib.sessions','django.contrib.messages','django.contrib.staticfiles','rest_framework','drf_spectacular','store']
MIDDLEWARE=['django.middleware.security.SecurityMiddleware','django.contrib.sessions.middleware.SessionMiddleware','django.middleware.common.CommonMiddleware','django.middleware.csrf.CsrfViewMiddleware','django.contrib.auth.middleware.AuthenticationMiddleware','django.contrib.messages.middleware.MessageMiddleware','django.middleware.clickjacking.XFrameOptionsMiddleware','store.middleware.Headers']
ROOT_URLCONF='config.urls'
TEMPLATES=[{'BACKEND':'django.template.backends.django.DjangoTemplates','DIRS':[BASE_DIR/'templates'],'APP_DIRS':True,'OPTIONS':{'context_processors':['django.template.context_processors.request','django.contrib.auth.context_processors.auth','django.contrib.messages.context_processors.messages']}}]
WSGI_APPLICATION='config.wsgi.application'
DATABASES={'default':{'ENGINE':'django.db.backends.postgresql','NAME':os.getenv('POSTGRES_DB','arkham'),'USER':os.getenv('POSTGRES_USER','arkham'),'PASSWORD':os.getenv('POSTGRES_PASSWORD',''),'HOST':os.getenv('POSTGRES_HOST','postgres'),'PORT':os.getenv('POSTGRES_PORT','5432'),'CONN_MAX_AGE':60}}
# SQLite is an explicit opt-in for local-only development; never production.
if os.getenv('DEV_SQLITE')=='1':
 if not DEBUG: raise ImproperlyConfigured('SQLite is forbidden in production')
 DATABASES={'default':{'ENGINE':'django.db.backends.sqlite3','NAME':BASE_DIR/'dev.sqlite3'}}
redis=os.getenv('REDIS_URL')
CACHES={'default':{'BACKEND':'django.core.cache.backends.redis.RedisCache','LOCATION':redis}} if redis else {'default':{'BACKEND':'django.core.cache.backends.locmem.LocMemCache'}}
if not DEBUG and not redis: raise ImproperlyConfigured('REDIS_URL is required in production')
AUTH_PASSWORD_VALIDATORS=[{'NAME':'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},{'NAME':'django.contrib.auth.password_validation.MinimumLengthValidator','OPTIONS':{'min_length':12}},{'NAME':'django.contrib.auth.password_validation.CommonPasswordValidator'},{'NAME':'django.contrib.auth.password_validation.NumericPasswordValidator'}]
LANGUAGE_CODE='fa-ir'
TIME_ZONE='Asia/Tehran'
USE_I18N=True
USE_TZ=True
STATIC_URL='/static/'
STATIC_ROOT=BASE_DIR/'staticfiles'
MEDIA_URL='/media/'
MEDIA_ROOT=BASE_DIR/'media'
DEFAULT_AUTO_FIELD='django.db.models.BigAutoField'
SESSION_COOKIE_HTTPONLY=True
SESSION_COOKIE_SECURE=not DEBUG
CSRF_COOKIE_SECURE=not DEBUG
SESSION_COOKIE_SAMESITE='Lax'
CSRF_COOKIE_SAMESITE='Lax'
SESSION_COOKIE_AGE=60*60*24*14
SESSION_SAVE_EVERY_REQUEST=False
SECURE_SSL_REDIRECT=not DEBUG
SECURE_PROXY_SSL_HEADER=('HTTP_X_FORWARDED_PROTO','https')
SECURE_HSTS_SECONDS=31536000 if not DEBUG else 0
SECURE_HSTS_INCLUDE_SUBDOMAINS=True
SECURE_HSTS_PRELOAD=False
SECURE_CONTENT_TYPE_NOSNIFF=True
X_FRAME_OPTIONS='DENY'
DATA_UPLOAD_MAX_MEMORY_SIZE=6*1024*1024
FILE_UPLOAD_MAX_MEMORY_SIZE=5*1024*1024
PAYMENT_PROVIDER=os.getenv('PAYMENT_PROVIDER','disabled')
ZARINPAL_MERCHANT_ID=os.getenv('ZARINPAL_MERCHANT_ID','')
if not DEBUG and PAYMENT_PROVIDER=='mock': raise ImproperlyConfigured('Mock payments are forbidden in production')
PUBLIC_ORIGIN=os.getenv('PUBLIC_ORIGIN','http://127.0.0.1:8000').rstrip('/')
if not DEBUG and not PUBLIC_ORIGIN.startswith('https://'): raise ImproperlyConfigured('PUBLIC_ORIGIN must use HTTPS')
REST_FRAMEWORK={'DEFAULT_AUTHENTICATION_CLASSES':['rest_framework.authentication.SessionAuthentication'],'DEFAULT_PERMISSION_CLASSES':['rest_framework.permissions.IsAuthenticatedOrReadOnly'],'DEFAULT_SCHEMA_CLASS':'drf_spectacular.openapi.AutoSchema','DEFAULT_PAGINATION_CLASS':'rest_framework.pagination.PageNumberPagination','PAGE_SIZE':24,'DEFAULT_THROTTLE_CLASSES':['rest_framework.throttling.AnonRateThrottle','rest_framework.throttling.UserRateThrottle'],'DEFAULT_THROTTLE_RATES':{'anon':'120/min','user':'300/min','sensitive':'10/min'},'EXCEPTION_HANDLER':'store.api.exception_handler','COERCE_DECIMAL_TO_STRING':True}
SPECTACULAR_SETTINGS={'TITLE':'ARKHAM API','VERSION':'1.0.0','SERVE_INCLUDE_SCHEMA':False}
LOGGING={'version':1,'disable_existing_loggers':False,'handlers':{'console':{'class':'logging.StreamHandler'}},'root':{'handlers':['console'],'level':'WARNING'}}''')
put('config/wsgi.py',"import os\nos.environ.setdefault('DJANGO_SETTINGS_MODULE','config.settings')\nfrom django.core.wsgi import get_wsgi_application\napplication=get_wsgi_application()")
put('store/__init__.py','')
put('store/models.py','''import uuid
from decimal import Decimal
from django.db import models
from django.conf import settings
from django.db.models import Q,F
from django.core.validators import MinValueValidator,MaxValueValidator,RegexValidator
from django.utils import timezone
money={'max_digits':14,'decimal_places':0,'validators':[MinValueValidator(0)]}
class Category(models.Model):
 name=models.CharField(max_length=120); slug=models.SlugField(unique=True); description=models.TextField(blank=True); active=models.BooleanField(default=True)
 def __str__(self): return self.name
class Product(models.Model):
 name=models.CharField(max_length=180); slug=models.SlugField(unique=True); category=models.ForeignKey(Category,on_delete=models.PROTECT,related_name='products'); description=models.TextField(blank=True); storage=models.TextField(blank=True); specifications=models.JSONField(default=dict,blank=True); active=models.BooleanField(default=False); featured=models.BooleanField(default=False); sort_order=models.PositiveIntegerField(default=0); seo_title=models.CharField(max_length=180,blank=True); meta_description=models.CharField(max_length=300,blank=True); created_at=models.DateTimeField(auto_now_add=True)
 class Meta: ordering=['sort_order','-created_at']
 def __str__(self): return self.name
class Variant(models.Model):
 product=models.ForeignKey(Product,on_delete=models.CASCADE,related_name='variants'); sku=models.CharField(max_length=64,unique=True); weight_g=models.PositiveIntegerField(validators=[MinValueValidator(1)]); price=models.DecimalField(**money); sale_price=models.DecimalField(**money,null=True,blank=True); sale_start=models.DateTimeField(null=True,blank=True); sale_end=models.DateTimeField(null=True,blank=True); stock=models.PositiveIntegerField(default=0); reserved=models.PositiveIntegerField(default=0); active=models.BooleanField(default=True)
 class Meta:
  constraints=[models.CheckConstraint(condition=Q(reserved__lte=F('stock')),name='reservation_within_stock'),models.CheckConstraint(condition=Q(price__gt=0),name='price_positive'),models.CheckConstraint(condition=Q(sale_price__isnull=True)|Q(sale_price__gt=0,sale_price__lt=F('price')),name='valid_sale_price')]
 @property
 def current_price(self):
  n=timezone.now()
  return self.sale_price if self.sale_price is not None and self.sale_start and self.sale_end and self.sale_start<=n<self.sale_end else self.price
 @property
 def available(self): return self.stock-self.reserved
 def __str__(self): return self.sku
class ProductImage(models.Model):
 product=models.ForeignKey(Product,on_delete=models.CASCADE,related_name='images'); image=models.ImageField(upload_to='products/%Y/%m/'); alt=models.CharField(max_length=180); position=models.PositiveIntegerField(default=0)
 class Meta: ordering=['position','id']
class Address(models.Model):
 user=models.ForeignKey(settings.AUTH_USER_MODEL,on_delete=models.CASCADE,related_name='addresses'); recipient=models.CharField(max_length=120); phone=models.CharField(max_length=11,validators=[RegexValidator(r'^09[0-9]{9}$')]); province=models.CharField(max_length=80); city=models.CharField(max_length=80); street=models.CharField(max_length=600); postal_code=models.CharField(max_length=10,validators=[RegexValidator(r'^[0-9]{10}$')])
class ShippingMethod(models.Model):
 name=models.CharField(max_length=120); cost=models.DecimalField(**money); active=models.BooleanField(default=True); provinces=models.JSONField(default=list,blank=True)
 def __str__(self): return self.name
class Cart(models.Model):
 user=models.OneToOneField(settings.AUTH_USER_MODEL,null=True,blank=True,on_delete=models.CASCADE); session_key=models.CharField(max_length=40,unique=True,null=True,blank=True); updated_at=models.DateTimeField(auto_now=True)
class CartItem(models.Model):
 cart=models.ForeignKey(Cart,on_delete=models.CASCADE,related_name='items'); variant=models.ForeignKey(Variant,on_delete=models.CASCADE); quantity=models.PositiveSmallIntegerField(validators=[MinValueValidator(1),MaxValueValidator(99)])
 class Meta: constraints=[models.UniqueConstraint(fields=['cart','variant'],name='one_variant_per_cart')]
class Coupon(models.Model):
 code=models.CharField(max_length=40,unique=True); kind=models.CharField(max_length=10,choices=[('percent','درصدی'),('fixed','مبلغ ثابت')]); value=models.DecimalField(**money); minimum=models.DecimalField(**money,default=0); starts_at=models.DateTimeField(); ends_at=models.DateTimeField(); usage_limit=models.PositiveIntegerField(default=1); per_user_limit=models.PositiveIntegerField(default=1); active=models.BooleanField(default=True)
class Order(models.Model):
 class Status(models.TextChoices):
  PENDING='pending','در انتظار پرداخت'; PAID='paid','پرداخت‌شده'; PROCESSING='processing','در حال آماده‌سازی'; SHIPPED='shipped','ارسال‌شده'; DELIVERED='delivered','تحویل‌شده'; CANCELLED='cancelled','لغوشده'; REVIEW='review','نیازمند بررسی مالی'
 id=models.UUIDField(primary_key=True,default=uuid.uuid4,editable=False); user=models.ForeignKey(settings.AUTH_USER_MODEL,on_delete=models.PROTECT,related_name='orders'); idempotency_key=models.UUIDField(); status=models.CharField(max_length=20,choices=Status.choices,default=Status.PENDING); address=models.JSONField(); subtotal=models.DecimalField(**money); discount=models.DecimalField(**money,default=0); shipping=models.DecimalField(**money); total=models.DecimalField(**money); shipping_name=models.CharField(max_length=120); coupon=models.ForeignKey(Coupon,on_delete=models.PROTECT,null=True,blank=True); tracking_code=models.CharField(max_length=120,blank=True); internal_note=models.TextField(blank=True); paid_at=models.DateTimeField(null=True,blank=True); created_at=models.DateTimeField(auto_now_add=True); expires_at=models.DateTimeField(); inventory_reserved=models.BooleanField(default=True)
 class Meta:
  ordering=['-created_at']; constraints=[models.UniqueConstraint(fields=['user','idempotency_key'],name='order_idempotency')]
class OrderItem(models.Model):
 order=models.ForeignKey(Order,on_delete=models.CASCADE,related_name='items'); variant=models.ForeignKey(Variant,on_delete=models.PROTECT); name=models.CharField(max_length=180); sku=models.CharField(max_length=64); weight_g=models.PositiveIntegerField(); quantity=models.PositiveSmallIntegerField(); unit_price=models.DecimalField(**money); line_total=models.DecimalField(**money)
class Payment(models.Model):
 order=models.OneToOneField(Order,on_delete=models.PROTECT,related_name='payment'); provider=models.CharField(max_length=20); authority=models.CharField(max_length=100,unique=True,null=True,blank=True); reference=models.CharField(max_length=100,unique=True,null=True,blank=True); state=models.CharField(max_length=20,default='new'); amount_toman=models.DecimalField(**money); created_at=models.DateTimeField(auto_now_add=True)
class InventoryMovement(models.Model):
 variant=models.ForeignKey(Variant,on_delete=models.PROTECT); order=models.ForeignKey(Order,on_delete=models.PROTECT,null=True); delta=models.IntegerField(); reason=models.CharField(max_length=200); actor=models.ForeignKey(settings.AUTH_USER_MODEL,null=True,on_delete=models.SET_NULL); created_at=models.DateTimeField(auto_now_add=True)
class Review(models.Model):
 product=models.ForeignKey(Product,on_delete=models.CASCADE,related_name='reviews'); user=models.ForeignKey(settings.AUTH_USER_MODEL,on_delete=models.CASCADE); rating=models.PositiveSmallIntegerField(validators=[MinValueValidator(1),MaxValueValidator(5)]); text=models.TextField(max_length=2000); approved=models.BooleanField(default=False); created_at=models.DateTimeField(auto_now_add=True)
 class Meta: constraints=[models.UniqueConstraint(fields=['product','user'],name='one_review_per_product')]
class Favorite(models.Model):
 user=models.ForeignKey(settings.AUTH_USER_MODEL,on_delete=models.CASCADE); product=models.ForeignKey(Product,on_delete=models.CASCADE)
 class Meta: constraints=[models.UniqueConstraint(fields=['user','product'],name='one_favorite')]
class Article(models.Model):
 title=models.CharField(max_length=180); slug=models.SlugField(unique=True); excerpt=models.CharField(max_length=300,blank=True); body=models.TextField(); published=models.BooleanField(default=False); updated_at=models.DateTimeField(auto_now=True)
class SiteContent(models.Model):
 key=models.SlugField(unique=True); title=models.CharField(max_length=180); body=models.TextField(blank=True); settings=models.JSONField(default=dict,blank=True); published=models.BooleanField(default=False)
 def __str__(self): return self.key
class Newsletter(models.Model):
 email=models.EmailField(unique=True); consent_at=models.DateTimeField(default=timezone.now); active=models.BooleanField(default=True)
class SupportMessage(models.Model):
 name=models.CharField(max_length=120); email=models.EmailField(); message=models.TextField(max_length=5000); created_at=models.DateTimeField(auto_now_add=True); resolved=models.BooleanField(default=False)
class Notification(models.Model):
 user=models.ForeignKey(settings.AUTH_USER_MODEL,on_delete=models.CASCADE); text=models.CharField(max_length=300); read=models.BooleanField(default=False); created_at=models.DateTimeField(auto_now_add=True)
class AuditLog(models.Model):
 actor=models.ForeignKey(settings.AUTH_USER_MODEL,null=True,on_delete=models.SET_NULL); action=models.CharField(max_length=100); object_type=models.CharField(max_length=80); object_id=models.CharField(max_length=100); detail=models.JSONField(default=dict); created_at=models.DateTimeField(auto_now_add=True)
 class Meta: ordering=['-created_at']
''')
put('store/middleware.py','''class Headers:
 def __init__(self,get_response): self.get_response=get_response
 def __call__(self,request):
  response=self.get_response(request)
  response['Referrer-Policy']='strict-origin-when-cross-origin'
  response['Permissions-Policy']='camera=(), microphone=(), geolocation=()'
  if not request.path.startswith('/django-admin/'):
   response['Content-Security-Policy']="default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; script-src 'self'; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'"
  if request.path.startswith(('/api/','/account','/checkout','/cart','/manage')): response['Cache-Control']='no-store'
  return response
''')
put('store/payments.py','''"""Amounts persisted in toman. The gateway boundary converts to integer rial."""
import json,uuid
from urllib.request import Request,urlopen
from urllib.error import URLError
from django.conf import settings
class GatewayUnavailable(Exception): pass
class GatewayRejected(Exception): pass
class MockGateway:
 def __init__(self):
  if not settings.DEBUG: raise GatewayUnavailable('Mock forbidden')
 def request(self,payment):
  a='dev-'+uuid.uuid4().hex
  return a,'/checkout?order='+str(payment.order_id)
 def verify(self,payment): return 'mock-'+payment.authority
class ZarinpalGateway:
 base='https://payment.zarinpal.com/pg/v4/payment/'
 def rpc(self,action,payload):
  if not settings.ZARINPAL_MERCHANT_ID: raise GatewayUnavailable('Gateway is not configured')
  try:
   req=Request(self.base+action+'.json',data=json.dumps({'merchant_id':settings.ZARINPAL_MERCHANT_ID,**payload}).encode(),headers={'Content-Type':'application/json'})
   with urlopen(req,timeout=15) as r: data=json.load(r)
   return data.get('data') or {}
  except (URLError,TimeoutError,ValueError): raise GatewayUnavailable('Gateway temporarily unavailable')
 def request(self,p):
  d=self.rpc('request',{'amount':int(p.amount_toman)*10,'description':'ARKHAM '+str(p.order_id),'callback_url':settings.PUBLIC_ORIGIN+'/api/v1/payments/callback/'})
  if d.get('code')!=100: raise GatewayRejected('Payment request rejected')
  a=d.get('authority','')
  if not a or len(a)>100: raise GatewayUnavailable('Invalid authority')
  return a,'https://payment.zarinpal.com/pg/StartPay/'+a
 def verify(self,p):
  d=self.rpc('verify',{'amount':int(p.amount_toman)*10,'authority':p.authority})
  if d.get('code') in (100,101) and d.get('ref_id'): return str(d['ref_id'])
  # A non-success response does not release stock automatically: reconcile uncertain outcomes.
  raise GatewayRejected('Payment was not verified')
def gateway(name):
 if name=='mock': return MockGateway()
 if name=='zarinpal': return ZarinpalGateway()
 raise GatewayUnavailable('پرداخت آنلاین هنوز توسط مدیر فعال نشده است.')
''')
put('store/services.py','''import uuid
from decimal import Decimal
from datetime import timedelta
from django.db import transaction
from django.db.models import Sum
from django.utils import timezone
from rest_framework.exceptions import ValidationError
from django.conf import settings
from .models import *
from .payments import gateway,GatewayUnavailable,GatewayRejected

def audit(actor,action,obj,detail=None):
 AuditLog.objects.create(actor=actor if actor and actor.is_authenticated else None,action=action,object_type=obj.__class__.__name__,object_id=str(obj.pk),detail=detail or {})
def cart_for(request):
 if request.user.is_authenticated: return Cart.objects.get_or_create(user=request.user)[0]
 if not request.session.session_key: request.session.create()
 return Cart.objects.get_or_create(session_key=request.session.session_key)[0]
@transaction.atomic
def merge_cart(user,session_key):
 if not session_key: return
 guest=Cart.objects.select_for_update().filter(session_key=session_key).first()
 if not guest: return
 target,_=Cart.objects.get_or_create(user=user)
 Cart.objects.select_for_update().get(pk=target.pk)
 for item in guest.items.all():
  existing=target.items.filter(variant=item.variant).first()
  if existing: existing.quantity=min(99,existing.quantity+item.quantity); existing.save()
  else: item.cart=target; item.save()
 guest.delete()
@transaction.atomic
def create_order(user,cart,address_id,shipping_id,key,code=''):
 # Serializing per-customer eliminates duplicate orders for one idempotency key.
 from django.contrib.auth import get_user_model
 get_user_model().objects.select_for_update().get(pk=user.pk)
 old=Order.objects.filter(user=user,idempotency_key=key).first()
 if old: return old
 gateway(settings.PAYMENT_PROVIDER)  # Fail closed before reserving if payments disabled.
 cart=Cart.objects.select_for_update().get(pk=cart.pk)
 items=list(cart.items.select_related('variant__product').order_by('variant_id'))
 if not items: raise ValidationError('سبد خرید خالی است.')
 address=Address.objects.filter(pk=address_id,user=user).first()
 shipping=ShippingMethod.objects.filter(pk=shipping_id,active=True).first()
 if not address or not shipping: raise ValidationError('آدرس یا روش ارسال معتبر نیست.')
 if shipping.provinces and address.province not in shipping.provinces: raise ValidationError('ارسال به این استان پشتیبانی نمی‌شود.')
 variants={v.pk:v for v in Variant.objects.select_for_update().filter(pk__in=[i.variant_id for i in items]).select_related('product__category').order_by('pk')}
 subtotal=Decimal(0)
 for i in items:
  v=variants[i.variant_id]
  if not v.active or not v.product.active or not v.product.category.active or v.available<i.quantity: raise ValidationError('موجودی محصول کافی نیست یا محصول غیرفعال است: '+v.product.name)
  subtotal+=v.current_price*i.quantity
 coupon=None; discount=Decimal(0); now=timezone.now()
 if code:
  coupon=Coupon.objects.select_for_update().filter(code=code.strip().upper(),active=True,starts_at__lte=now,ends_at__gt=now).first()
  if not coupon or coupon.minimum>subtotal: raise ValidationError('کد تخفیف معتبر نیست.')
  used=Order.objects.filter(coupon=coupon).exclude(status=Order.Status.CANCELLED)
  if used.count()>=coupon.usage_limit or used.filter(user=user).count()>=coupon.per_user_limit: raise ValidationError('سقف استفاده از تخفیف تکمیل شده است.')
  if coupon.kind=='percent':
   if coupon.value>100: raise ValidationError('تنظیمات تخفیف نامعتبر است.')
   discount=(subtotal*coupon.value/100).quantize(Decimal('1'))
  else: discount=min(subtotal,coupon.value)
 snapshot={k:getattr(address,k) for k in ['recipient','phone','province','city','street','postal_code']}
 order=Order.objects.create(user=user,idempotency_key=key,address=snapshot,subtotal=subtotal,discount=discount,shipping=shipping.cost,total=subtotal-discount+shipping.cost,shipping_name=shipping.name,coupon=coupon,expires_at=now+timedelta(minutes=20))
 if order.total<=0: raise ValidationError('مبلغ پرداخت باید مثبت باشد.')
 for i in items:
  v=variants[i.variant_id]; price=v.current_price
  OrderItem.objects.create(order=order,variant=v,name=v.product.name,sku=v.sku,weight_g=v.weight_g,quantity=i.quantity,unit_price=price,line_total=price*i.quantity)
  v.reserved+=i.quantity; v.save(update_fields=['reserved'])
 Payment.objects.create(order=order,provider=settings.PAYMENT_PROVIDER,amount_toman=order.total)
 cart.items.all().delete()
 audit(user,'order.created',order)
 return order
@transaction.atomic
def start_payment(order_id,user):
 o=Order.objects.select_for_update().get(pk=order_id,user=user)
 p=Payment.objects.select_for_update().get(order=o)
 if o.status!='pending' or not o.inventory_reserved or o.expires_at<=timezone.now(): raise ValidationError('این سفارش قابل پرداخت نیست؛ با پشتیبانی تماس بگیرید.')
 if p.authority:
  return '/checkout?order='+str(o.pk) if p.provider=='mock' else 'https://payment.zarinpal.com/pg/StartPay/'+p.authority
 if p.state not in ['new']: raise ValidationError('وضعیت پرداخت نیازمند بررسی است؛ درخواست جدید ارسال نشد.')
 # Persist ambiguous state even on a remote timeout; never retry blindly.
 p.state='requesting'; p.save(update_fields=['state'])
 try: a,url=gateway(p.provider).request(p)
 except (GatewayUnavailable,GatewayRejected) as exc:
  p.state='unknown'; p.save(update_fields=['state'])
  return None
 p.authority=a; p.state='pending'; p.save()
 audit(user,'payment.started',o)
 return url
@transaction.atomic
def settle_payment(authority,actor=None):
 # All payment paths acquire locks in the same order: order -> payment -> variants.
 payment=Payment.objects.get(authority=authority)
 o=Order.objects.select_for_update().get(pk=payment.order_id)
 p=Payment.objects.select_for_update().get(pk=payment.pk)
 if p.state=='succeeded': return o
 if not p.authority: raise ValidationError('تراکنش شروع نشده است.')
 ref=gateway(p.provider).verify(p)
 p.reference=ref; p.state='succeeded'; p.save()
 if not o.inventory_reserved or o.status!='pending':
  o.status='review'; o.save(update_fields=['status'])
  audit(actor,'payment.review_required',o); return o
 for i in o.items.order_by('variant_id'):
  v=Variant.objects.select_for_update().get(pk=i.variant_id)
  if v.stock<i.quantity or v.reserved<i.quantity: raise ValidationError('مغایرت موجودی؛ بررسی مالی لازم است.')
  v.stock-=i.quantity; v.reserved-=i.quantity; v.save(update_fields=['stock','reserved'])
  InventoryMovement.objects.create(variant=v,order=o,delta=-i.quantity,reason='paid order',actor=actor if actor and actor.is_authenticated else None)
 o.status='paid'; o.paid_at=timezone.now(); o.inventory_reserved=False; o.save()
 Notification.objects.create(user=o.user,text='پرداخت سفارش '+str(o.pk)+' تأیید شد.')
 audit(actor,'payment.verified',o)
 return o
@transaction.atomic
def cancel_unstarted(order_id,user):
 o=Order.objects.select_for_update().get(pk=order_id,user=user)
 p=Payment.objects.select_for_update().get(order=o)
 if o.status!='pending' or p.state!='new': raise ValidationError('پرداخت شروع‌شده یا نامشخص فقط پس از تطبیق با درگاه قابل لغو است.')
 for i in o.items.order_by('variant_id'):
  v=Variant.objects.select_for_update().get(pk=i.variant_id); v.reserved-=i.quantity; v.save(update_fields=['reserved'])
 o.inventory_reserved=False; o.status='cancelled'; o.save(); audit(user,'order.cancelled',o)
 return o
@transaction.atomic
def transition(order_id,actor,status,tracking='',note=''):
 o=Order.objects.select_for_update().get(pk=order_id)
 allowed={'paid':['processing'],'processing':['shipped'],'shipped':['delivered']}
 if status not in allowed.get(o.status,[]): raise ValidationError('تغییر وضعیت مجاز نیست.')
 if status=='shipped' and not tracking.strip(): raise ValidationError('کد رهگیری الزامی است.')
 previous=o.status; o.status=status; o.tracking_code=tracking; o.internal_note=note; o.save()
 audit(actor,'order.transition',o,{'from':previous,'to':status})
 Notification.objects.create(user=o.user,text='وضعیت سفارش: '+o.get_status_display())
 return o
''')
put('store/serializers.py','''from rest_framework import serializers
from django.utils import timezone
from django.contrib.auth import get_user_model
from django.core.files.base import ContentFile
from PIL import Image,UnidentifiedImageError
from io import BytesIO
import uuid
from .models import *
class ImageSerializer(serializers.ModelSerializer):
 class Meta: model=ProductImage; fields=['id','image','alt','position']
class VariantSerializer(serializers.ModelSerializer):
 current_price=serializers.DecimalField(max_digits=14,decimal_places=0,read_only=True); available=serializers.IntegerField(read_only=True)
 class Meta: model=Variant; fields=['id','sku','weight_g','price','current_price','available']
class CategorySerializer(serializers.ModelSerializer):
 class Meta: model=Category; fields=['id','name','slug','description']
class ProductSerializer(serializers.ModelSerializer):
 variants=serializers.SerializerMethodField(); images=ImageSerializer(many=True,read_only=True); category=CategorySerializer(read_only=True)
 def get_variants(self,obj): return VariantSerializer([v for v in obj.variants.all() if v.active],many=True).data
 class Meta: model=Product; fields=['id','name','slug','category','description','storage','specifications','featured','seo_title','meta_description','variants','images']
class AddressSerializer(serializers.ModelSerializer):
 class Meta: model=Address; exclude=['user']
class ShippingSerializer(serializers.ModelSerializer):
 class Meta: model=ShippingMethod; fields=['id','name','cost','provinces']
class OrderItemSerializer(serializers.ModelSerializer):
 class Meta: model=OrderItem; fields=['name','sku','weight_g','quantity','unit_price','line_total']
class OrderSerializer(serializers.ModelSerializer):
 items=OrderItemSerializer(many=True,read_only=True); payment_state=serializers.CharField(source='payment.state',read_only=True); payment_provider=serializers.CharField(source='payment.provider',read_only=True)
 class Meta: model=Order; fields=['id','status','address','subtotal','discount','shipping','total','shipping_name','tracking_code','created_at','expires_at','paid_at','items','payment_state','payment_provider']
class CheckoutSerializer(serializers.Serializer):
 address=serializers.IntegerField(min_value=1); shipping=serializers.IntegerField(min_value=1); idempotency_key=serializers.UUIDField(); coupon=serializers.CharField(max_length=40,required=False,allow_blank=True)
class CartInput(serializers.Serializer):
 variant=serializers.IntegerField(min_value=1); quantity=serializers.IntegerField(min_value=0,max_value=99)
class ReviewSerializer(serializers.ModelSerializer):
 author=serializers.SerializerMethodField()
 def get_author(self,obj): return obj.user.first_name or 'خریدار'
 class Meta: model=Review; fields=['id','product','rating','text','author','created_at']; read_only_fields=['author','created_at']
 def validate(self,data):
  user=self.context['request'].user; p=data['product']
  if not p.active or not OrderItem.objects.filter(order__user=user,order__paid_at__isnull=False,order__status__in=['paid','processing','shipped','delivered'],variant__product=p).exists(): raise serializers.ValidationError('ثبت نظر فقط پس از خرید این محصول امکان‌پذیر است.')
  if Review.objects.filter(user=user,product=p).exists(): raise serializers.ValidationError('برای این محصول قبلاً نظر ثبت کرده‌اید.')
  return data
class ArticleSerializer(serializers.ModelSerializer):
 class Meta: model=Article; fields=['title','slug','excerpt','body','updated_at']
class SiteContentSerializer(serializers.ModelSerializer):
 class Meta: model=SiteContent; fields=['key','title','body','settings']
class SupportSerializer(serializers.ModelSerializer):
 class Meta: model=SupportMessage; fields=['name','email','message']
class NewsletterSerializer(serializers.Serializer):
 email=serializers.EmailField(); consent=serializers.BooleanField()
 def validate_consent(self,v):
  if not v: raise serializers.ValidationError('رضایت صریح الزامی است.')
  return v
class RegisterSerializer(serializers.Serializer):
 username=serializers.RegexField(r'^[a-zA-Z0-9_.@+-]{3,150}$'); email=serializers.EmailField(); first_name=serializers.CharField(max_length=100); password=serializers.CharField(write_only=True,max_length=128)
 def validate(self,d):
  from django.contrib.auth.password_validation import validate_password
  if get_user_model().objects.filter(username__iexact=d['username']).exists(): raise serializers.ValidationError('این نام کاربری قابل استفاده نیست.')
  if get_user_model().objects.filter(email__iexact=d['email']).exists(): raise serializers.ValidationError('این ایمیل قابل استفاده نیست.')
  u=get_user_model()(username=d['username'],email=d['email'],first_name=d['first_name'])
  validate_password(d['password'],u)
  return d
class LoginSerializer(serializers.Serializer):
 username=serializers.CharField(max_length=150); password=serializers.CharField(max_length=128,write_only=True)

def admin_serializer(model,readonly=()):
 class S(serializers.ModelSerializer):
  class Meta:
   fields='__all__'; read_only_fields=readonly
  def validate(self,data):
   if model==Variant:
    price=data.get('price',getattr(self.instance,'price',0)); sale=data.get('sale_price',getattr(self.instance,'sale_price',None)); start=data.get('sale_start',getattr(self.instance,'sale_start',None)); end=data.get('sale_end',getattr(self.instance,'sale_end',None))
    if price<=0 or (sale is not None and (sale<=0 or sale>=price or not start or not end or start>=end)): raise serializers.ValidationError('قیمت یا بازه تخفیف معتبر نیست.')
   if model==Coupon:
    kind=data.get('kind',getattr(self.instance,'kind','')); value=data.get('value',getattr(self.instance,'value',0)); start=data.get('starts_at',getattr(self.instance,'starts_at',None)); end=data.get('ends_at',getattr(self.instance,'ends_at',None))
    if value<=0 or (kind=='percent' and value>100) or not start or not end or start>=end: raise serializers.ValidationError('تنظیمات تخفیف معتبر نیست.')
    if 'code' in data: data['code']=data['code'].strip().upper()
   if model==Product and 'specifications' in data and not isinstance(data['specifications'],dict): raise serializers.ValidationError('مشخصات باید یک شیء JSON باشد.')
   if model==ShippingMethod and 'provinces' in data and (not isinstance(data['provinces'],list) or not all(isinstance(s,str) for s in data['provinces'])): raise serializers.ValidationError('استان‌ها باید آرایه‌ای از نام استان‌ها باشند.')
   if model==SiteContent and 'settings' in data and not isinstance(data['settings'],dict): raise serializers.ValidationError('تنظیمات باید یک شیء JSON باشد.')
   return data
  def validate_image(self,f):
   if f.size>5*1024*1024: raise serializers.ValidationError('حداکثر حجم تصویر ۵ مگابایت است.')
   try:
    im=Image.open(f)
    if im.format not in ('JPEG','PNG','WEBP') or im.width*im.height>20000000: raise ValueError()
    im.load(); im=im.convert('RGB'); im.thumbnail((2400,2400)); out=BytesIO(); im.save(out,'WEBP',quality=88)
    return ContentFile(out.getvalue(),name=uuid.uuid4().hex+'.webp')
   except (UnidentifiedImageError,ValueError,OSError,Image.DecompressionBombError): raise serializers.ValidationError('تصویر معتبر نیست.')
 S.Meta.model=model
 return S
''')
put('store/api.py','''import uuid
from decimal import Decimal
from django.contrib.auth import authenticate,login,logout,get_user_model
from django.utils import timezone
from django.db import transaction,connection
from django.db.models import Q,F,Min,Case,When,DecimalField,Sum,Count
from django.shortcuts import redirect
from django.http import JsonResponse,HttpResponse
from django.views.decorators.csrf import ensure_csrf_cookie,csrf_protect
from django.utils.decorators import method_decorator
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import viewsets,status,permissions,serializers
from rest_framework.views import APIView,exception_handler as drf_exception_handler
from rest_framework.response import Response
from rest_framework.decorators import action,api_view,permission_classes
from rest_framework.throttling import ScopedRateThrottle
from django.core.cache import cache
from .models import *
from .serializers import *
from .services import *
from .payments import GatewayUnavailable,GatewayRejected

def exception_handler(exc,context):
 if isinstance(exc,DjangoValidationError): exc=serializers.ValidationError(exc.messages)
 if isinstance(exc,(GatewayUnavailable,GatewayRejected)): return Response({'error':{'message':str(exc)}},status=503)
 response=drf_exception_handler(exc,context)
 if response is not None: response.data={'error':response.data}
 return response
class PublicRead(viewsets.ReadOnlyModelViewSet): permission_classes=[permissions.AllowAny]
class ProductView(PublicRead):
 serializer_class=ProductSerializer; lookup_field='slug'
 def get_queryset(self):
  now=timezone.now(); p=self.request.query_params
  qs=Product.objects.filter(active=True,category__active=True).select_related('category').prefetch_related('variants','images')
  effective=Case(When(variants__active=True,variants__sale_start__lte=now,variants__sale_end__gt=now,variants__sale_price__isnull=False,then=F('variants__sale_price')),default=F('variants__price'),output_field=DecimalField())
  qs=qs.annotate(min_price=Min(effective,filter=Q(variants__active=True)))
  if p.get('q'): qs=qs.filter(Q(name__icontains=p['q'][:180])|Q(description__icontains=p['q'][:180]))
  if p.get('category'): qs=qs.filter(category__slug=p['category'])
  for name,op in [('min_price','gte'),('max_price','lte')]:
   if p.get(name):
    try: val=Decimal(p[name]); assert val.is_finite() and 0<=val<=10**14
    except Exception: raise serializers.ValidationError('بازه قیمت معتبر نیست.')
    qs=qs.filter(**{'min_price__'+op:val})
  if p.get('weight'):
   try: weight=int(p['weight'])
   except ValueError: raise serializers.ValidationError('وزن معتبر نیست.')
   qs=qs.filter(variants__weight_g=weight,variants__active=True)
  if p.get('available')=='1': qs=qs.filter(variants__stock__gt=F('variants__reserved'),variants__active=True)
  if p.get('sale')=='1': qs=qs.filter(variants__sale_start__lte=now,variants__sale_end__gt=now,variants__sale_price__isnull=False,variants__active=True)
  if p.get('featured')=='1': qs=qs.filter(featured=True)
  sort=p.get('sort','newest')
  if sort=='bestselling':
   from django.db.models import OuterRef,Subquery
   sales=OrderItem.objects.filter(variant__product=OuterRef('pk'),order__paid_at__isnull=False,order__status__in=['paid','processing','shipped','delivered']).values('variant__product').annotate(qty=Sum('quantity')).values('qty')
   qs=qs.annotate(sold=Subquery(sales)).order_by(F('sold').desc(nulls_last=True),'-id')
  else: qs=qs.order_by({'price':'min_price','-price':'-min_price','newest':'-created_at'}.get(sort,'-created_at'),'-id')
  return qs.distinct()
class CategoryView(PublicRead): queryset=Category.objects.filter(active=True); serializer_class=CategorySerializer; pagination_class=None
class ContentView(PublicRead): queryset=SiteContent.objects.filter(published=True); serializer_class=SiteContentSerializer; lookup_field='key'; pagination_class=None
class ArticleView(PublicRead): queryset=Article.objects.filter(published=True).order_by('-updated_at'); serializer_class=ArticleSerializer; lookup_field='slug'
class ShippingView(PublicRead): queryset=ShippingMethod.objects.filter(active=True); serializer_class=ShippingSerializer; pagination_class=None
@method_decorator(ensure_csrf_cookie,name='dispatch')
class SessionView(APIView):
 permission_classes=[permissions.AllowAny]
 def get(self,r):
  u=r.user
  return Response({'authenticated':u.is_authenticated,'user':{'id':u.pk,'username':u.username,'first_name':u.first_name,'is_staff':u.is_staff,'permissions':sorted(u.get_all_permissions())} if u.is_authenticated else None,'payment_provider':settings.PAYMENT_PROVIDER,'development':settings.DEBUG})
@method_decorator(csrf_protect,name='dispatch')
class AuthView(APIView):
 permission_classes=[permissions.AllowAny]; throttle_classes=[ScopedRateThrottle]; throttle_scope='sensitive'
 def post(self,r,kind):
  if kind=='logout': logout(r); return Response({'ok':True})
  old=r.session.session_key
  if kind=='register':
   s=RegisterSerializer(data=r.data); s.is_valid(raise_exception=True)
   with transaction.atomic(): user=get_user_model().objects.create_user(**s.validated_data)
  elif kind=='login':
   s=LoginSerializer(data=r.data); s.is_valid(raise_exception=True)
   # Account-keyed limiter in addition to the remote-IP throttle.
   import hashlib
   k='login:'+hashlib.sha256(s.validated_data['username'].lower().encode()).hexdigest()
   if cache.get(k,0)>=10: return Response({'error':'تلاش‌های ورود بیش از حد مجاز است؛ بعداً تلاش کنید.'},status=429)
   user=authenticate(r,**s.validated_data)
   if not user:
    cache.add(k,0,900); cache.incr(k)
    return Response({'error':'نام کاربری یا رمز عبور درست نیست.'},status=400)
   cache.delete(k)
  else: return Response(status=404)
  merge_cart(user,old); login(r,user)
  return Response({'ok':True})
class AddressView(viewsets.ModelViewSet):
 serializer_class=AddressSerializer; permission_classes=[permissions.IsAuthenticated]
 def get_queryset(self): return Address.objects.filter(user=self.request.user)
 def perform_create(self,s): s.save(user=self.request.user)
class CartView(APIView):
 permission_classes=[permissions.AllowAny]
 def payload(self,r):
  c=cart_for(r); data=[]; total=Decimal(0)
  for i in c.items.select_related('variant__product').order_by('id'):
   v=i.variant; price=v.current_price; total+=price*i.quantity
   data.append({'variant':v.pk,'product':v.product.name,'slug':v.product.slug,'weight_g':v.weight_g,'quantity':i.quantity,'price':str(price),'available':v.available,'line_total':str(price*i.quantity),'active':v.active and v.product.active})
  return {'items':data,'subtotal':str(total),'currency':'IRT'}
 def get(self,r): return Response(self.payload(r))
 @method_decorator(csrf_protect)
 def post(self,r):
  s=CartInput(data=r.data); s.is_valid(raise_exception=True); d=s.validated_data
  with transaction.atomic():
   c=cart_for(r); Cart.objects.select_for_update().get(pk=c.pk)
   v=Variant.objects.filter(pk=d['variant'],active=True,product__active=True,product__category__active=True).first()
   if not v: raise serializers.ValidationError('محصول قابل خرید نیست.')
   if d['quantity']==0: c.items.filter(variant=v).delete()
   else:
    if v.available<d['quantity']: raise serializers.ValidationError('موجودی کافی نیست.')
    CartItem.objects.update_or_create(cart=c,variant=v,defaults={'quantity':d['quantity']})
  return Response(self.payload(r))
class OrderView(viewsets.ReadOnlyModelViewSet):
 serializer_class=OrderSerializer; permission_classes=[permissions.IsAuthenticated]
 def get_queryset(self): return Order.objects.filter(user=self.request.user).prefetch_related('items').select_related('payment')
 def create(self,r):
  s=CheckoutSerializer(data=r.data); s.is_valid(raise_exception=True); d=s.validated_data
  o=create_order(r.user,cart_for(r),d['address'],d['shipping'],d['idempotency_key'],d.get('coupon',''))
  return Response(OrderSerializer(o).data,status=201)
 @action(detail=True,methods=['post'])
 def pay(self,r,pk=None):
  self.get_object(); url=start_payment(pk,r.user)
  if not url: return Response({'error':'پاسخ درگاه نامشخص است؛ پرداخت دوباره آغاز نشد. با پشتیبانی تماس بگیرید.'},status=503)
  return Response({'url':url})
 @action(detail=True,methods=['post'])
 def simulate(self,r,pk=None):
  o=self.get_object()
  if not settings.DEBUG or o.payment.provider!='mock': return Response(status=404)
  if not o.payment.authority: raise serializers.ValidationError('ابتدا پرداخت را آغاز کنید.')
  return Response(OrderSerializer(settle_payment(o.payment.authority,r.user)).data)
 @action(detail=True,methods=['post'])
 def cancel(self,r,pk=None):
  self.get_object(); return Response(OrderSerializer(cancel_unstarted(pk,r.user)).data)
 @action(detail=True,methods=['get'])
 def invoice(self,r,pk=None):
  return invoice_response(self.get_object())
def invoice_response(o):
 from django.template.loader import render_to_string
 return HttpResponse(render_to_string('invoice.html',{'order':o,'items':o.items.all()}))
class Callback(APIView):
 permission_classes=[permissions.AllowAny]
 def get(self,r):
  a=r.query_params.get('Authority','')
  p=Payment.objects.filter(authority=a,provider='zarinpal').first()
  if not p: return Response({'error':'تراکنش معتبر نیست.'},status=400)
  # Status in the browser is deliberately not trusted. Remote verification is authoritative.
  try: o=settle_payment(a)
  except (GatewayUnavailable,GatewayRejected): return redirect('/account?payment=unverified')
  return redirect('/orders/'+str(o.pk))
class ReviewView(viewsets.ModelViewSet):
 serializer_class=ReviewSerializer; http_method_names=['get','post','head','options']
 def get_queryset(self):
  q=Review.objects.filter(approved=True,product__active=True).select_related('user')
  if self.request.query_params.get('product'): q=q.filter(product_id=self.request.query_params['product'])
  return q.order_by('-created_at')
 def perform_create(self,s): s.save(user=self.request.user,approved=False)
class FavoriteView(APIView):
 permission_classes=[permissions.IsAuthenticated]
 def get(self,r): return Response(ProductSerializer(Product.objects.filter(active=True,favorite__user=r.user).prefetch_related('variants','images').select_related('category'),many=True).data)
 def post(self,r):
  s=serializers.IntegerField(min_value=1); pk=s.run_validation(r.data.get('product'))
  if not Product.objects.filter(pk=pk,active=True).exists(): return Response(status=404)
  Favorite.objects.get_or_create(user=r.user,product_id=pk); return Response({'ok':True})
 def delete(self,r): Favorite.objects.filter(user=r.user,product_id=r.data.get('product')).delete(); return Response(status=204)
class NewsletterView(APIView):
 permission_classes=[permissions.AllowAny]; throttle_classes=[ScopedRateThrottle]; throttle_scope='sensitive'
 @method_decorator(csrf_protect)
 def post(self,r):
  s=NewsletterSerializer(data=r.data); s.is_valid(raise_exception=True)
  Newsletter.objects.update_or_create(email=s.validated_data['email'].lower(),defaults={'active':True,'consent_at':timezone.now()})
  return Response({'ok':True})
 def delete(self,r):
  if not r.user.is_authenticated: return Response(status=403)
  Newsletter.objects.filter(email__iexact=r.user.email).update(active=False); return Response(status=204)
class SupportView(APIView):
 permission_classes=[permissions.AllowAny]; throttle_classes=[ScopedRateThrottle]; throttle_scope='sensitive'
 @method_decorator(csrf_protect)
 def post(self,r):
  s=SupportSerializer(data=r.data); s.is_valid(raise_exception=True); s.save(); return Response({'ok':True},status=201)
class NotificationView(APIView):
 permission_classes=[permissions.IsAuthenticated]
 def get(self,r): return Response(list(Notification.objects.filter(user=r.user).order_by('-created_at').values('id','text','read','created_at')[:100]))
 def post(self,r): Notification.objects.filter(user=r.user,pk=r.data.get('id')).update(read=True); return Response({'ok':True})
class ModelPermissions(permissions.DjangoModelPermissions):
 perms_map={**permissions.DjangoModelPermissions.perms_map,'GET':['%(app_label)s.view_%(model_name)s'],'HEAD':['%(app_label)s.view_%(model_name)s'],'OPTIONS':['%(app_label)s.view_%(model_name)s']}
 def has_permission(self,r,v): return r.user.is_authenticated and r.user.is_staff and super().has_permission(r,v)
class AdminModelView(viewsets.ModelViewSet):
 permission_classes=[ModelPermissions]; http_method_names=['get','post','put','patch','head','options']
 def perform_create(self,s):
  with transaction.atomic(): obj=s.save(); audit(self.request.user,'admin.created',obj)
 def perform_update(self,s):
  with transaction.atomic():
   # Serialize edits with stock reservation paths, not stale serializer instances.
   current=self.get_queryset().select_for_update().get(pk=s.instance.pk); s.instance=current
   obj=s.save(); audit(self.request.user,'admin.updated',obj)
ADMIN_MODELS={'products':(Product,()),'categories':(Category,()),'variants':(Variant,('stock','reserved')),'images':(ProductImage,()),'shipping':(ShippingMethod,()),'coupons':(Coupon,()),'articles':(Article,()),'content':(SiteContent,()),'reviews':(Review,('product','user','rating','text','created_at')),'support':(SupportMessage,('name','email','message','created_at'))}
class StockAdjust(APIView):
 permission_classes=[permissions.IsAdminUser]
 def post(self,r,pk):
  if not r.user.has_perm('store.change_variant'): return Response(status=403)
  delta=serializers.IntegerField(min_value=-100000,max_value=100000).run_validation(r.data.get('delta'))
  reason=serializers.CharField(max_length=200,min_length=3).run_validation(r.data.get('reason'))
  with transaction.atomic():
   v=Variant.objects.select_for_update().get(pk=pk)
   if v.stock+delta<v.reserved: raise serializers.ValidationError('موجودی از رزروهای فعال کمتر خواهد شد.')
   v.stock+=delta; v.save(update_fields=['stock'])
   InventoryMovement.objects.create(variant=v,delta=delta,reason=reason,actor=r.user); audit(r.user,'inventory.adjusted',v,{'delta':delta,'reason':reason})
  return Response({'stock':v.stock,'reserved':v.reserved})
class AdminOrderView(viewsets.ReadOnlyModelViewSet):
 queryset=Order.objects.all().select_related('payment').prefetch_related('items'); serializer_class=OrderSerializer; permission_classes=[ModelPermissions]
 def get_queryset(self):
  q=super().get_queryset(); st=self.request.query_params.get('status'); term=self.request.query_params.get('q')
  if st: q=q.filter(status=st)
  if term:
   try: q=q.filter(pk=uuid.UUID(term))
   except ValueError: q=q.filter(user__username__icontains=term[:150])
  return q
 @action(detail=True,methods=['post'])
 def transition(self,r,pk=None):
  if not r.user.has_perm('store.change_order'): return Response(status=403)
  s=serializers.CharField(max_length=20).run_validation(r.data.get('status'))
  tracking=serializers.CharField(max_length=120,allow_blank=True).run_validation(r.data.get('tracking_code',''))
  note=serializers.CharField(max_length=5000,allow_blank=True).run_validation(r.data.get('note',''))
  return Response(OrderSerializer(transition(pk,r.user,s,tracking,note)).data)
 @action(detail=True,methods=['get'])
 def invoice(self,r,pk=None): return invoice_response(self.get_object())
class AdminAudit(viewsets.ReadOnlyModelViewSet):
 queryset=AuditLog.objects.all(); serializer_class=admin_serializer(AuditLog); permission_classes=[ModelPermissions]
class AdminCustomers(APIView):
 permission_classes=[permissions.IsAdminUser]
 def get(self,r):
  if not r.user.has_perm('auth.view_user'): return Response(status=403)
  users=get_user_model().objects.filter(is_staff=False)
  if r.query_params.get('q'): users=users.filter(username__icontains=r.query_params['q'][:150])
  return Response(list(users.order_by('-date_joined').values('id','username','first_name','email','date_joined','is_active')[:100]))
class Dashboard(APIView):
 permission_classes=[permissions.IsAdminUser]
 def get(self,r):
  if not r.user.has_perms(['store.view_order','store.view_variant','auth.view_user']): return Response(status=403)
  paid=Order.objects.filter(paid_at__isnull=False).exclude(status__in=['review','cancelled']); today=timezone.localdate()
  return Response({'paid_revenue':str(paid.aggregate(total=Sum('total'))['total'] or 0),'today_revenue':str(paid.filter(paid_at__date=today).aggregate(total=Sum('total'))['total'] or 0),'orders':Order.objects.count(),'pending':Order.objects.filter(status='pending').count(),'shipped':Order.objects.filter(status='shipped').count(),'customers':get_user_model().objects.filter(is_staff=False).count(),'low_stock':list(Variant.objects.filter(active=True,stock__lte=F('reserved')+5).values('id','sku','stock','reserved')[:20]),'daily_sales':list(paid.extra(select={'day':"date(paid_at AT TIME ZONE 'Asia/Tehran')"}).values('day').annotate(revenue=Sum('total')).order_by('-day')[:30]),'recent_orders':OrderSerializer(Order.objects.all()[:8],many=True).data})
@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def health(r):
 try:
  with connection.cursor() as c: c.execute('SELECT 1'); c.fetchone()
  cache.set('health','ok',10)
  if cache.get('health')!='ok': raise RuntimeError()
 except Exception: return Response({'status':'unavailable'},status=503)
 return Response({'status':'ok'})
''')
put('config/urls.py','''from django.contrib import admin
from django.urls import path,include,re_path
from django.conf import settings
from django.conf.urls.static import static
from rest_framework.routers import DefaultRouter
from drf_spectacular.views import SpectacularAPIView,SpectacularSwaggerView
from store import api,web
router=DefaultRouter()
for name,view,base in [('products',api.ProductView,'product'),('categories',api.CategoryView,'category'),('content',api.ContentView,'content'),('articles',api.ArticleView,'article'),('shipping',api.ShippingView,'shipping'),('addresses',api.AddressView,'address'),('orders',api.OrderView,'order'),('reviews',api.ReviewView,'review')]: router.register(name,view,basename=base)
for name,(model,ro) in api.ADMIN_MODELS.items():
 view=type('Admin'+model.__name__,(api.AdminModelView,),{'queryset':model.objects.all().order_by('-pk'),'serializer_class':api.admin_serializer(model,ro),'__module__':'store.api'})
 router.register('admin/'+name,view,basename='admin-'+name)
router.register('admin/orders',api.AdminOrderView,basename='admin-order')
router.register('admin/audit',api.AdminAudit,basename='admin-audit')
urlpatterns=[path('django-admin/',admin.site.urls),path('api/v1/session/',api.SessionView.as_view()),path('api/v1/accounts/<str:kind>/',api.AuthView.as_view()),path('api/v1/cart/',api.CartView.as_view()),path('api/v1/favorites/',api.FavoriteView.as_view()),path('api/v1/newsletter/',api.NewsletterView.as_view()),path('api/v1/support/',api.SupportView.as_view()),path('api/v1/notifications/',api.NotificationView.as_view()),path('api/v1/payments/callback/',api.Callback.as_view()),path('api/v1/admin/stock/<int:pk>/',api.StockAdjust.as_view()),path('api/v1/admin/dashboard/',api.Dashboard.as_view()),path('api/v1/admin/customers/',api.AdminCustomers.as_view()),path('api/v1/health/',api.health),path('api/v1/schema/',SpectacularAPIView.as_view(),name='schema'),path('api/v1/docs/',SpectacularSwaggerView.as_view(url_name='schema')),path('api/v1/',include(router.urls)),path('sitemap.xml',web.sitemap),path('robots.txt',web.robots)]
if settings.DEBUG:
 from django.views.static import serve
 from pathlib import Path
 urlpatterns += [re_path(r'^assets/(?P<path>.*)$',serve,{'document_root':Path(settings.BASE_DIR).parent/'frontend/dist/assets'}),re_path(r'^fonts/(?P<path>.*)$',serve,{'document_root':Path(settings.BASE_DIR).parent/'frontend/dist/fonts'})]
 urlpatterns += static(settings.MEDIA_URL,document_root=settings.MEDIA_ROOT)
urlpatterns += [re_path(r'^(?!api/|static/|media/|assets/|fonts/).*$',web.shell)]
''')
put('store/web.py','''import json
from pathlib import Path
from html import escape
from django.http import HttpResponse
from django.conf import settings
from django.template.loader import render_to_string
from .models import Product,Article,SiteContent

def shell(request):
 dist=Path(settings.BASE_DIR).parent/'frontend/dist'
 index=dist/'index.html'
 if not index.exists(): return HttpResponse('Frontend build missing. Run npm ci && npm run build.',status=503)
 title='ARKHAM | فروشگاه عسل'; description='فروشگاه اینترنتی آرکهام'; seo=''; schema=None; code=200; canonical=request.path
 path=request.path.strip('/').split('/')
 if len(path)==2 and path[0]=='products':
  p=Product.objects.filter(slug=path[1],active=True,category__active=True).prefetch_related('variants','images').first()
  if not p: code=404; title='محصول یافت نشد | ARKHAM'
  else:
   title=p.seo_title or p.name+' | ARKHAM'; description=p.meta_description or p.description[:200]
   seo=render_to_string('product_seo.html',{'product':p,'variants':[v for v in p.variants.all() if v.active]})
   # IRR is an ISO 4217 currency. Toman is converted only at this boundary.
   variants=[v for v in p.variants.all() if v.active]
   schema={'@context':'https://schema.org','@type':'Product','name':p.name,'description':p.description,'url':settings.PUBLIC_ORIGIN+request.path,'offers':[{'@type':'Offer','sku':v.sku,'price':str(v.current_price*10),'priceCurrency':'IRR','availability':'https://schema.org/InStock' if v.available>0 else 'https://schema.org/OutOfStock','url':settings.PUBLIC_ORIGIN+request.path} for v in variants]}
   images=[settings.PUBLIC_ORIGIN+i.image.url for i in p.images.all()]
   if images: schema['image']=images
 elif len(path)==2 and path[0]=='journal':
  a=Article.objects.filter(slug=path[1],published=True).first()
  if not a: code=404
  else: title=a.title+' | ARKHAM'; description=a.excerpt; seo='<article><h1>'+escape(a.title)+'</h1><p>'+escape(a.body)+'</p></article>'
 elif request.path not in ['/','/products','/cart','/checkout','/login','/account','/favorites','/journal','/contact','/track','/manage'] and path[0] not in ['category','orders','pages']:
  code=404; title='صفحه یافت نشد | ARKHAM'
 html=index.read_text().replace('<!--SEO_TITLE-->',escape(title)).replace('<!--SEO_DESCRIPTION-->',escape(description,quote=True)).replace('<!--CANONICAL-->',escape(settings.PUBLIC_ORIGIN+canonical,quote=True)).replace('<!--SSR_CONTENT-->',seo)
 noindex=any(request.path.startswith(p) for p in ['/cart','/checkout','/account','/orders','/login','/favorites','/manage','/track']) or bool(request.GET) or code==404
 html=html.replace('<!--ROBOTS-->','noindex,nofollow' if noindex else 'index,follow')
 if schema: html=html.replace('<!--SCHEMA-->','<script type="application/ld+json">'+json.dumps(schema,ensure_ascii=False).replace('<','\\u003c')+'</script>')
 return HttpResponse(html,status=code)
def sitemap(r):
 from xml.sax.saxutils import escape as xml_escape
 paths=['/','/products','/journal','/contact']+['/products/'+p for p in Product.objects.filter(active=True,category__active=True).values_list('slug',flat=True)]+['/journal/'+s for s in Article.objects.filter(published=True).values_list('slug',flat=True)]+['/pages/'+s for s in SiteContent.objects.filter(published=True).values_list('key',flat=True)]
 return HttpResponse('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+''.join('<url><loc>'+xml_escape(settings.PUBLIC_ORIGIN+p)+'</loc></url>' for p in paths)+'</urlset>',content_type='application/xml')
def robots(r): return HttpResponse('User-agent: *\\nDisallow: /api/\\nDisallow: /django-admin/\\nDisallow: /manage\\nDisallow: /account\\nDisallow: /orders/\\nDisallow: /cart\\nDisallow: /checkout\\nDisallow: /login\\nDisallow: /favorites\\nDisallow: /track\\nSitemap: '+settings.PUBLIC_ORIGIN+'/sitemap.xml',content_type='text/plain')
''')
put('templates/product_seo.html','''<article><h1>{{ product.name }}</h1><p>{{ product.description }}</p><ul>{% for v in variants %}<li>{{ v.weight_g }} گرم — {{ v.current_price }} تومان — موجودی: {{ v.available }}</li>{% endfor %}</ul></article>''')
put('templates/invoice.html','''<!doctype html><html lang="fa" dir="rtl"><meta charset="utf-8"><title>صورتحساب ARKHAM</title><body><h1>صورتحساب سفارش ARKHAM</h1><p>{{ order.id }}</p><p>وضعیت: {{ order.get_status_display }}</p><p>{{ order.address.recipient }} — {{ order.address.city }} — {{ order.address.street }}</p><table><thead><tr><th>محصول</th><th>تعداد</th><th>قیمت واحد / تومان</th><th>جمع / تومان</th></tr></thead><tbody>{% for i in items %}<tr><td>{{ i.name }} / {{ i.weight_g }} گرم</td><td>{{ i.quantity }}</td><td>{{ i.unit_price }}</td><td>{{ i.line_total }}</td></tr>{% endfor %}</tbody></table><p>ارسال: {{ order.shipping }} تومان</p><p>تخفیف: {{ order.discount }} تومان</p><strong>مبلغ نهایی: {{ order.total }} تومان</strong><p>این سند فقط وضعیت ثبت‌شده سفارش را نشان می‌دهد و فاکتور رسمی مالیاتی نیست.</p></body></html>''')
put('store/admin.py','''from django.contrib import admin
from .models import *
# Internal admin is read-only for money, identity, stock and audit records.
class ReadOnly(admin.ModelAdmin):
 def has_add_permission(self,r): return False
 def has_change_permission(self,r,obj=None): return False
 def has_delete_permission(self,r,obj=None): return False
for model in [Order,OrderItem,Payment,InventoryMovement,AuditLog,Variant,Cart,CartItem,Newsletter,Address,Notification,ProductImage]: admin.site.register(model,ReadOnly)
for model in [Category,Product,Coupon,ShippingMethod,Review,Article,SiteContent,SupportMessage]: admin.site.register(model)
admin.site.site_header='مدیریت داخلی ARKHAM'
''')
put('store/management/__init__.py','')
put('store/management/commands/__init__.py','')
put('store/management/commands/setup_roles.py','''from django.core.management.base import BaseCommand
from django.contrib.auth.models import Group,Permission
class Command(BaseCommand):
 help='Create least-privilege roles; never creates users or passwords.'
 def handle(self,*args,**kw):
  roles={'مدیر محصولات':{'product','category','variant','productimage'},'مدیر محتوا':{'article','sitecontent'},'مسئول سفارش‌ها':{'order'},'پشتیبانی':{'supportmessage','review'},'مدیر فروشگاه':{'product','category','variant','productimage','article','sitecontent','order','shippingmethod','coupon','review','supportmessage','auditlog'}}
  for name,models in roles.items():
   g,_=Group.objects.get_or_create(name=name)
   perms=Permission.objects.filter(content_type__app_label='store',content_type__model__in=models).exclude(codename__startswith='delete_')
   g.permissions.set(perms)
   if name=='مدیر فروشگاه': g.permissions.add(Permission.objects.get(content_type__app_label='auth',codename='view_user'))
  self.stdout.write('Roles configured. Assign staff status and groups explicitly via the protected admin.')
''')
put('store/management/commands/expire_unstarted.py','''from django.core.management.base import BaseCommand
from django.utils import timezone
from store.models import Order
from store.services import cancel_unstarted
class Command(BaseCommand):
 help='Release only expired orders that have never initiated gateway payment.'
 def handle(self,*args,**kw):
  n=0
  for o in Order.objects.filter(status='pending',expires_at__lt=timezone.now(),payment__state='new').select_related('user'):
   cancel_unstarted(o.pk,o.user); n+=1
  self.stdout.write(str(n)+' unstarted orders expired. Pending/unknown gateway payments require reconciliation.')
''')
