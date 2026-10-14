/* PAWSIGN website content. Edit text, photos and numbers here. */

// Product lines. img = first 8 photos (assets/products), more = extra photos in assets/gallery/<id>-NN.jpg,
// cut = number of cut-out photos in assets/cutouts/<id>-N.webp, color = the line's colour.
window.LINES = [
  {id:'toys', color:'#9fd4ff', ink:'#0b5aa6', more:35, cut:6, img:['toys-1','toys-2','toys-3','toys-4','toys-5','toys-6','toys-7','toys-8'],
   en:{tab:'Toys', t:'Plush and squeaky toys', d:'Plush, rubber-spike and crinkle toys in any shape, from sea animals to food characters.', made:'Tianchang, Anhui', cap:'500,000 toys a month'},
   zh:{tab:'玩具', t:'毛绒与发声玩具', d:'毛绒、橡胶刺球和响纸玩具，造型不限，从海洋动物到美食卡通。', made:'安徽天长', cap:'每月50万件玩具'}},
  {id:'snuffle', color:'#ffd84d', ink:'#8a5a00', more:44, cut:5, img:['enrich-1','enrich-2','enrich-3','enrich-4','seasonal-1','seasonal-3','seasonal-4','seasonal-6'],
   en:{tab:'Seasonal', t:'Snuffle mats and holiday toys', d:'Treat-hiding snuffle mats and full Halloween and Christmas collections.', made:'Tianchang, Anhui', cap:'New seasonal ranges every year'},
   zh:{tab:'节日系列', t:'嗅闻垫与节日玩具', d:'藏食嗅闻垫，以及完整的万圣节和圣诞节系列。', made:'安徽天长', cap:'每年推出新的季节系列'}},
  {id:'apparel', color:'#ffb8cc', ink:'#a3164a', more:34, cut:5, img:['apparel-1','apparel-2','apparel-3','apparel-4','apparel-5','apparel-6','apparel-7','apparel-8'],
   en:{tab:'Apparel', t:'Tees, hoodies and pajamas', d:'Everyday pet apparel with prints, embroidery and matching family sets.', made:'Tianchang and Cambodia', cap:'550,000 pieces a month'},
   zh:{tab:'服装', t:'T恤、卫衣与睡衣', d:'日常宠物服装，支持印花、刺绣和亲子款。', made:'天长和柬埔寨', cap:'每月55万件'}},
  {id:'costumes', color:'#cdbcff', ink:'#4b2bb3', more:15, cut:5, img:['costumes-1','costumes-2','costumes-3','costumes-4','costumes-5','costumes-6','costumes-7','costumes-8'],
   en:{tab:'Costumes', t:'Costumes', d:'Halloween and party costumes for dogs and cats, with hoods, wings and props.', made:'Tianchang and Cambodia', cap:'Part of apparel capacity'},
   zh:{tab:'装扮服', t:'宠物装扮服', d:'适合猫狗的万圣节和派对装扮服，含头套、翅膀和道具。', made:'天长和柬埔寨', cap:'包含在服装产能内'}},
  {id:'sweaters', color:'#ffc7a1', ink:'#a3420a', more:20, cut:5, img:['sweaters-1','sweaters-2','sweaters-3','sweaters-4','sweaters-5','sweaters-6','sweaters-7','sweaters-8'],
   en:{tab:'Sweaters', t:'Knit sweaters', d:'Cable knits, argyle, Fair Isle and holiday sweaters, knitted in-house.', made:'Tonglu and Cambodia', cap:'400,000 sweaters a month'},
   zh:{tab:'毛衣', t:'针织毛衣', d:'麻花针、菱格、费尔岛和节日毛衣，全部在自有工厂织造。', made:'桐庐和柬埔寨', cap:'每月40万件毛衣'}},
  {id:'outerwear', color:'#9fe6c8', ink:'#0b6e4a', more:13, cut:5, img:['outerwear-1','outerwear-2','outerwear-3','outerwear-4','outerwear-5','outerwear-6','outerwear-7','outerwear-8'],
   en:{tab:'Outerwear', t:'Jackets and outerwear', d:'Puffer jackets, raincoats and packable coats, with matching dog boots.', made:'Tianchang and Cambodia', cap:'Part of apparel capacity'},
   zh:{tab:'外套', t:'夹克与外套', d:'棉服、雨衣和可收纳外套，并配套狗鞋。', made:'天长和柬埔寨', cap:'包含在服装产能内'}},
  {id:'beds', color:'#ecd9bd', ink:'#7a4b12', more:16, cut:5, img:['beds-1','beds-2','beds-3','beds-5','beds-6','beds-7','beds-8','beds-9'],
   en:{tab:'Beds', t:'Beds and cat houses', d:'Bolster beds, cave beds and cat houses in plush, plaid and knit fabrics.', made:'Tianchang, Anhui', cap:'Custom sizes and fabrics'},
   zh:{tab:'宠物床', t:'宠物床与猫窝', d:'靠枕床、窝床和猫屋，可选毛绒、格纹和针织面料。', made:'安徽天长', cap:'尺寸和面料可定制'}},
  {id:'access', color:'#ffa98f', ink:'#a32e0a', more:28, cut:5, img:['access-1','access-2','access-3','access-4','access-5','access-6','access-7','access-8'],
   en:{tab:'Accessories', t:'Accessories', d:'Bandanas, bow ties, hats, holiday headbands and non-slip socks.', made:'Tianchang and Tonglu', cap:'Custom packaging and cards'},
   zh:{tab:'配饰', t:'配饰', d:'领巾、领结、帽子、节日发箍和防滑袜。', made:'天长和桐庐', cap:'包装和吊卡可定制'}},
];

window.SHOPS = [['target','Target'],['walmart','Walmart'],['petsmart','PetSmart'],['petco','Petco'],['action','Action'],['walgreens','Walgreens'],
  ['tjmaxx','TJ Maxx'],['cvs','CVS'],['lowes',"Lowe's"],['carrefour','Carrefour'],['ross','Ross'],['aldi','ALDI']];

window.FACTORIES = [
  {name:'Tianchang Sign Crafts Co., Ltd.', img:'assets/factory/tianchang-1.jpg', badge:'assets/brand/sign.png', area:16500, team:151,
   addr:'Area B, Industrial Park, Chajian Town, Tianchang, Anhui, China',
   en:{desc:'Our main China factory for pet apparel, plush toys and beds, with its own cutting, sewing, filling and sampling workshops.',
       products:'Pet apparel, pet toys, pet beds', work:'Cutting, sewing, filling and carding, finishing, QC, sampling, warehouse'},
   zh:{desc:'集团在中国的主力工厂，生产宠物服装、毛绒玩具和宠物床，拥有独立的裁剪、缝制、充棉和打样车间。',
       products:'宠物服装、宠物玩具、宠物床', work:'裁剪、缝制、充棉梳棉、后整、质检、打样、仓库'}},
  {name:'Tonglu Hongyou Knitting Co., Ltd.', img:'assets/factory/tonglu-2.jpg', badge:'assets/brand/hy.png', area:3335, team:146,
   addr:'Building 2, No. 1028 Tongqian Road, Hengcun Town, Tonglu, Hangzhou, China',
   en:{desc:'Our knitting specialist, where the group started. Pet sweaters, knitted garments, scarves and hats.',
       products:'Pet sweaters, knitted garments, scarves and hats', work:'Cutting, sewing, filling and carding, finishing, QC, sampling, warehouse'},
   zh:{desc:'集团的起点，专注针织生产：宠物毛衣、针织服装、围巾和帽子。',
       products:'宠物毛衣、针织服装、围巾和帽子', work:'裁剪、缝制、充棉梳棉、后整、质检、打样、仓库'}},
  {name:'High Sense (Cambodia) Co., Ltd.', img:'assets/factory/cambodia-1.jpg', badge:'assets/brand/hs.png', area:10000, team:610,
   addr:'Land Title No. 46, Phum Bos Ta Ney, Khum Kahaeng, Samraong Tong District, Kampong Speu Province, Cambodia (53 km from Phnom Penh)',
   en:{desc:'Our largest factory, 53 km from Phnom Penh, with duty advantages into the EU, US, Japan, Canada, Korea and Australia.',
       products:'Apparel, pet apparel, knitted garments, scarves and hats', work:'Cutting, sewing, knitting, printing and embroidery, finishing, QC, warehouse'},
   zh:{desc:'集团规模最大的工厂，距金边53公里，出口欧盟、美国、日本、加拿大、韩国和澳大利亚享有关税优势。',
       products:'服装、宠物服装、针织服装、围巾和帽子', work:'裁剪、缝制、针织、印花和刺绣、后整、质检、仓库'}},
];

// Export markets drawn on the Cambodia route map
window.MARKETS = [
  {key:'m.eu', flag:'eu', color:'#7aa7ff'}, {key:'m.us', flag:'us', color:'#ff7b9c'}, {key:'m.jp', flag:'jp', color:'#ffd84d'},
  {key:'m.ca', flag:'ca', color:'#ff9f6e'}, {key:'m.kr', flag:'kr', color:'#9fe6c8'}, {key:'m.au', flag:'au', color:'#cdbcff'},
];

// Words in the big scrolling band
window.WORDS = {en:['Toys','Sweaters','Costumes','Beds','Apparel','Outerwear','Snuffle mats','Accessories'],
                zh:['玩具','毛衣','装扮服','宠物床','服装','外套','嗅闻垫','配饰']};

/* Chinese text. English is read from the page itself. */
window.ZH = {
  'tagline':'为宠物，为一生',
  'nav.products':'产品','nav.process':'合作流程','nav.factories':'工厂','nav.cambodia':'柬埔寨优势','nav.trust':'认证',
  'cta.quote':'获取报价','cta.start':'开始合作','cta.catalog':'2025产品目录',
  'hero.tag':'中国和柬埔寨宠物用品 OEM / ODM 制造商',
  'hero.l1':'为宠物而生。','hero.l2':'为零售而造。',
  'hero.lead':'宠物服装、玩具和宠物床，出自我们自己的三家工厂，已进入 Target、Walmart、PetSmart 等零售商的货架。',
  'sticker.1':'每月产量（件）','hero.sold':'产品销往',
  'story':'自2008年起，PAWSIGN 从桐庐的一家针织工坊，发展为在中国和柬埔寨拥有三家工厂的集团。我们为欧美多家大型零售商设计、打样并生产宠物用品。',
  'n.1':'每月产量（件）','n.2':'名员工，分布于三家工厂','n.3':'平方米厂房面积','n.4':'款产品，收录于2025年目录',
  'coll.h2':'八大产品系列，一站式供应。','coll.p':'向下滚动浏览我们的产品系列。所有产品均在自有工厂生产，可按您的面料、颜色、标签和包装定制。',
  'ex.h2':'浏览完整产品目录','ex.p':'2025年目录中的全部269款产品。选择产品线，点击任意图片放大查看，并向我们询价。',
  'madeat':'生产工厂','capacity':'产能','line.quote':'获取该产品线报价',
  'pr.h2':'从草图到货架','pr.p':'五个步骤，一个团队，三家工厂。从第一张草图到装箱出货，全程由一位专人对接。',
  's1.h':'需求沟通','s1.p':'发来草图、照片或样品，我们确认材料、尺码、包装和目标价格。',
  's2.h':'打样','s2.p':'800平方米的打样车间在下单前为您制作样品供确认。',
  's3.h':'生产','s3.p':'裁剪、缝制、针织、充棉、印花和刺绣均在自有工厂完成，员工900多人。',
  's4.h':'质量检验','s4.p':'每家工厂都设有独立质检区，每批订单在包装前都会经过检验。',
  's5.h':'包装与出口','s5.p':'最大3,000平方米的仓库负责包装，并可从中国或柬埔寨出货，选择关税更优的一方。',
  'fac.h2':'三家工厂，一个团队','fac.p':'订单可在中国和柬埔寨工厂之间灵活分配，兼顾价格、交期和进口关税。',
  'ft.1':'中国安徽 · 2014年起','ft.2':'中国杭州 · 2008年起','ft.3':'柬埔寨 · 2023年起',
  'k.area':'平方米厂房面积','k.team':'名员工','k.products':'产品','k.workshops':'车间','k.address':'地址',
  'cap.h3':'月产能','cap.p':'集团每月产能达145万件，大型零售项目和旺季订单都能按时交货。',
  'china':'中国','cambodia':'柬埔寨',
  'bar.1':'宠物玩具（中国）','bar.2':'宠物服装（柬埔寨）','bar.3':'宠物服装（中国）','bar.4':'宠物毛衣（中国）','bar.5':'宠物毛衣（柬埔寨）',
  'kh.h2':'从柬埔寨出货，关税更低','kh.p':'柬埔寨是联合国认定的最不发达国家之一，因此我们磅士卑工厂的产品在六大主要市场享有贸易优惠。',
  'kh.origin':'柬埔寨磅士卑省',
  'm.eu':'欧盟','m.eu.p':'普惠制（GSP）：自2011年1月起，出口至欧盟国家可享关税减免。',
  'm.us':'美国','m.us.p':'享有最惠国待遇，纺织品和服装可获优惠条件。',
  'm.jp':'日本','m.jp.p':'东盟-日本协定：免征通常10%–12%的进口税，且不受配额限制。',
  'm.ca':'加拿大','m.ca.p':'根据加拿大对最不发达国家的优惠关税，免配额、免关税。',
  'm.kr':'韩国','m.kr.p':'免配额、免关税进口，限制条件极少。',
  'm.au':'澳大利亚','m.au.p':'享有与其他发达市场一致的免税待遇。',
  'kh.note':'具体关税取决于产品及其材料。告诉我们您的目标市场，我们会为您的订单确认最合适的工厂。',
  'trust.h2':'通过全球零售审核','trust.p':'我们的工厂通过了大型零售商要求的社会责任、道德贸易和材料认证审核，帮助您的合规团队快速完成供应商审批。',
  'c.bsci':'社会责任审核，关注工作条件','c.sedex':'道德供应链审核，可与买家共享',
  'c.grs.n':'全球回收标准（GRS）','c.grs':'再生材料认证','c.ocs.n':'有机含量标准（OCS）','c.ocs':'有机材料认证','c.scan':'供应链安全与合规审核',
  'retail.h3':'我们的产品在这些零售商有售','retail.p':'如需您所在市场的合作案例，欢迎咨询。',
  'cta.h2':'您的品牌，我们的工厂。','cta.p':'我们已在为多家知名宠物及综合零售商生产自有品牌产品。告诉我们您的需求，下单前先拿到样品。','cta.samples':'申请样品',
  'contact.p':'请告诉我们产品、数量和目标市场，我们的团队会回复报价和打样时间。',
  'f.name':'姓名','f.company':'公司','f.email':'邮箱','f.country':'国家/地区','f.product':'产品线','f.qty':'订单数量（例如：每款5,000件）',
  'f.msg':'款式、尺码、材料、包装、目标价格、交货日期','f.send':'发送询价','f.note':'您的询价将直接发送给我们的销售负责人 Ryan Lu。',
  'person.role':'PAWSIGN 集团销售负责人','cat.title':'下载2025年产品目录','cat.sub':'共58页，PDF，15 MB',
  'group':'PAWSIGN 集团','top':'返回顶部','close':'关闭'
};

window.T = {
  en:{several:'Several products', sending:'Sending…', sendingNote:'Sending your inquiry…', sentH:'Inquiry sent',
      sent:(n,e)=>`Thank you, ${n}. Ryan Lu will reply to ${e} with pricing and sample timing.`,
      fail:(m,e)=>`Your inquiry could not be sent. Check your connection and try again, or <a href="${m}">email it to ${e}</a>.`,
      enlarge:'Enlarge photo', viewAll:n=>`View all ${n} photos`, fewer:'Show fewer photos', showing:(a,b)=>`Showing ${a} of ${b} photos`, all:n=>`All ${n} photos`,
      prev:'Previous photo', next:'Next photo', view:'View', explore:n=>`Explore ${n} products`, products:'products',
      title:'PAWSIGN | Pet Products Manufacturer in China and Cambodia', tablist:'Product lines', lightbox:'Product photo', menu:'Menu', madeAt:'Made at', capacity:'Capacity'},
  zh:{several:'多种产品', sending:'发送中…', sendingNote:'正在发送您的询价…', sentH:'询价已发送',
      sent:(n,e)=>`谢谢您，${n}。Ryan Lu 会回复至 ${e}，提供报价和打样时间。`,
      fail:(m,e)=>`询价发送失败。请检查网络后重试，或<a href="${m}">直接发邮件至 ${e}</a>。`,
      enlarge:'放大图片', viewAll:n=>`查看全部${n}张图片`, fewer:'收起图片', showing:(a,b)=>`已显示${a}张，共${b}张`, all:n=>`共${n}张图片`,
      prev:'上一张', next:'下一张', view:'查看', explore:n=>`浏览${n}款产品`, products:'款产品',
      title:'PAWSIGN | 中国和柬埔寨宠物用品制造商', tablist:'产品线', lightbox:'产品图片', menu:'菜单', madeAt:'生产工厂', capacity:'产能'}
};
