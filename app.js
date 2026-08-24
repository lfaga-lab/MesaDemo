(() => {
  "use strict";

  const CONFIG = window.MESA_CONFIG || {};
  const STORAGE_KEY = "nuvora-mesa-demo-v1";
  const channel = "BroadcastChannel" in window ? new BroadcastChannel("nuvora-mesa-demo") : null;
  const money = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });

  const menu = [
    {id:1,name:"Burrata de estación",detail:"Tomates asados, albahaca y oliva",category:"Entradas",price:11800},
    {id:2,name:"Croquetas de hongos",detail:"Alioli de ajo negro · 4 unidades",category:"Entradas",price:9200},
    {id:3,name:"Provoleta MESA",detail:"Pesto, miel picante y pan de campo",category:"Entradas",price:10500},
    {id:4,name:"Ojo de bife",detail:"Papas rotas y chimichurri de hierbas",category:"Principales",price:23800},
    {id:5,name:"Pesca del día",detail:"Puré de coliflor y vegetales",category:"Principales",price:21600},
    {id:6,name:"Risotto de calabaza",detail:"Azafrán, almendras y parmesano",category:"Principales",price:17400},
    {id:7,name:"Hamburguesa MESA",detail:"Doble carne, cheddar y papas",category:"Principales",price:15300},
    {id:8,name:"Pasta corta",detail:"Crema de hongos y tomillo",category:"Principales",price:16800},
    {id:9,name:"Tiramisú",detail:"Café, mascarpone y cacao",category:"Postres",price:8200},
    {id:10,name:"Flan de dulce de leche",detail:"Crema batida y sal marina",category:"Postres",price:7400},
    {id:11,name:"Agua con gas",detail:"500 ml",category:"Bebidas",price:3200},
    {id:12,name:"Copa Malbec",detail:"Bodega Zuccardi",category:"Bebidas",price:6900},
    {id:13,name:"Limonada de jengibre",detail:"Menta fresca",category:"Bebidas",price:5100}
  ];

  const tables = [
    {id:11,seats:2,status:"ocupada",guest:"Sofía Martínez"},{id:12,seats:4,status:"ocupada",guest:"James Carter"},
    {id:13,seats:4,status:"reservada",guest:"Familia Nguyen"},{id:14,seats:2,status:"libre",guest:""},
    {id:21,seats:4,status:"libre",guest:""},{id:22,seats:6,status:"ocupada",guest:"Kevin Taylor"},
    {id:23,seats:4,status:"reservada",guest:"Cena empresarial"},{id:24,seats:2,status:"limpieza",guest:""},
    {id:31,seats:2,status:"libre",guest:""},{id:32,seats:4,status:"libre",guest:""},
    {id:33,seats:8,status:"ocupada",guest:"Mesa sin reserva"},{id:34,seats:4,status:"libre",guest:""}
  ];

  const initialOrders = [
    {id:1084,table:12,waiter:"Luna",createdAt:"20:32",status:"preparacion",elapsed:18,items:[{...menu[4],qty:1,note:"Poco hecho"},{...menu[7],qty:1},{...menu[11],qty:2}]},
    {id:1085,table:22,waiter:"Nayra",createdAt:"20:26",status:"preparacion",elapsed:24,items:[{...menu[3],qty:1,note:"Sin sal"},{...menu[0],qty:1},{...menu[12],qty:2}]},
    {id:1086,table:33,waiter:"Efrén",createdAt:"20:41",status:"listo",elapsed:9,items:[{...menu[5],qty:1},{...menu[7],qty:1},{...menu[10],qty:2}]}
  ];

  const state = { view:"panel", orders:loadOrders(), selectedTable:12, draft:[], category:"Principales" };
  const $ = (selector) => document.querySelector(selector);
  const content = $("#content");

  function loadOrders(){ try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || structuredClone(initialOrders); } catch { return structuredClone(initialOrders); } }
  function saveOrders(broadcast=true){ localStorage.setItem(STORAGE_KEY, JSON.stringify(state.orders)); if(broadcast && channel) channel.postMessage({type:"orders",orders:state.orders}); updateBadge(); }
  function syncFromStorage(){ state.orders=loadOrders(); render(); }
  function statusLabel(status){ return ({nuevo:"Nuevo",preparacion:"En preparación",listo:"Listo",entregado:"Entregado"})[status] || status; }
  function total(order){ return order.items.reduce((sum,item)=>sum+item.price*item.qty,0); }
  function count(order){ return order.items.reduce((sum,item)=>sum+item.qty,0); }
  function updateBadge(){ const n=state.orders.filter(o=>o.status==="listo").length; const badge=$("#readyBadge"); badge.textContent=n; badge.classList.toggle("hidden",!n); }
  function toast(message){ const el=$("#toast"); el.textContent=message; el.classList.remove("hidden"); clearTimeout(toast.timer); toast.timer=setTimeout(()=>el.classList.add("hidden"),2600); }

  async function api(path="",options={}){
    if(!CONFIG.apiUrl) throw new Error("local");
    const response=await fetch(`${CONFIG.apiUrl}${path}`,{...options,headers:{"content-type":"application/json",...(options.headers||{})}});
    if(!response.ok) throw new Error("api");
    return response.json();
  }

  async function pullRemote(){
    if(!CONFIG.apiUrl) return;
    try { const data=await api(); state.orders=(data.orders||[]).map(o=>({...o,table:o.tableNumber||o.table})); saveOrders(false); render(); } catch {}
  }

  function miniMap(){
    return `<div class="mini-map small-map"><span class="plant plant-1">✦</span><span class="plant plant-2">✦</span><span class="plant plant-3">✦</span>${tables.map(t=>`<button class="mini-table t${t.id} ${t.status}" data-table="${t.id}">${t.id}</button>`).join("")}<span class="bar-label">BARRA</span></div>`;
  }

  function renderPanel(){
    const active=state.orders.filter(o=>o.status!=="entregado");
    return `<div class="page-heading"><div><p class="eyebrow">OPERACIÓN EN VIVO</p><h1>Todo el servicio,<br><em>en una sola vista.</em></h1></div><p>Salón, cocina y caja trabajan con la misma información. Sin papel, sin dobles cargas y sin pedidos perdidos.</p></div>
      <section class="metric-cards">
        <article class="metric"><span>Reservas</span><strong>32</strong><small>para hoy</small></article><article class="metric"><span>Cubiertos</span><strong>24</strong><small>ahora</small></article><article class="metric"><span>Comandas</span><strong>${active.length}</strong><small>en curso</small></article><article class="metric"><span>Tiempo medio</span><strong>18 min</strong><small>−4 min vs. ayer</small></article><article class="metric"><span>Venta de hoy</span><strong>$ 784.200</strong><small>+12% vs. ayer</small></article>
      </section>
      <section class="dashboard-grid static">
        <article class="panel"><div class="panel-head"><div><p class="eyebrow">SALÓN PRINCIPAL</p><h2>Mapa de mesas</h2></div><button class="text-button" data-view="mesas">Ver salón →</button></div>${miniMap()}<div class="legend"><span><i class="free"></i>Libre</span><span><i class="busy"></i>Ocupada</span><span><i class="reserved"></i>Reservada</span><span><i class="cleaning"></i>Limpieza</span></div></article>
        <article class="panel"><div class="panel-head"><div><p class="eyebrow">COCINA</p><h2>Pedidos activos</h2></div><button class="text-button" data-view="cocina">Ver cocina →</button></div><div class="active-list">${active.slice(0,4).map(o=>`<button data-view="cocina"><div><strong>Mesa ${o.table}</strong><small>#${o.id} · ${count(o)} productos</small></div><span class="status ${o.status}">${statusLabel(o.status)}</span></button>`).join("")}</div>${state.orders.some(o=>o.status==="listo")?`<div class="ready-callout"><span>✓</span><div><strong>Pedido listo</strong><small>Esperando retiro de salón</small></div></div>`:""}</article>
        <article class="quick-action panel"><p class="eyebrow">ACCIÓN RÁPIDA</p><h2>¿Llegó una mesa?</h2><p>Cargá el pedido desde el dispositivo del mozo y enviá la comanda a cocina.</p><button class="primary large" data-new-order>+ Cargar comanda</button></article>
      </section>`;
  }

  function renderTables(){
    return `<div class="view-title"><div><p class="eyebrow">SALÓN PRINCIPAL</p><h1>Mapa de mesas</h1><p>Seleccioná una mesa para abrir o continuar su comanda.</p></div><div class="sync-note"><i></i>Información actualizada</div></div><section class="table-cards">${tables.map(t=>{const n=state.orders.filter(o=>o.table===t.id&&o.status!=="entregado").length;return `<button class="table-card" data-table="${t.id}"><span class="table-dot ${t.status}">${t.id}</span><em>${statusName(t.status)}</em><strong>Mesa ${t.id}</strong><small>${t.seats} personas · ${t.guest||"Sin reserva"}</small>${n?`<span class="open-label">${n} comanda${n>1?"s":""} →</span>`:`<span class="open-label">Abrir comanda →</span>`}</button>`}).join("")}</section>`;
  }

  function renderOrders(){
    return `<div class="view-title"><div><p class="eyebrow">SALÓN</p><h1>Comandas</h1><p>Seguimiento de todos los pedidos del servicio actual.</p></div><button class="primary large" data-new-order>+ Nueva comanda</button></div><section class="panel orders-table"><div class="table-header"><span>Pedido</span><span>Mesa</span><span>Mozo/a</span><span>Detalle</span><span>Hora</span><span>Estado</span><span>Total</span></div>${state.orders.map(o=>`<div class="table-row"><strong>#${o.id}</strong><b>Mesa ${o.table}</b><span>${o.waiter}</span><span>${count(o)} productos</span><span>${o.createdAt}</span><span class="status ${o.status}">${statusLabel(o.status)}</span><b>${money.format(total(o))}</b></div>`).join("")}</section>`;
  }

  function renderKitchen(){
    const active=state.orders.filter(o=>o.status!=="entregado");
    const columns=[{id:"nuevo",title:"Nuevos",hint:"Confirmar recepción"},{id:"preparacion",title:"En preparación",hint:"Pedidos en curso"},{id:"listo",title:"Listos",hint:"Retira salón"}];
    return `<div class="view-title"><div><p class="eyebrow">KITCHEN DISPLAY SYSTEM</p><h1>Pantalla de cocina</h1><p>Las comandas aparecen ordenadas por tiempo y prioridad.</p></div><div class="sync-note"><i></i>Recepción automática</div></div><div class="kitchen-board">${columns.map(c=>{const items=active.filter(o=>o.status===c.id);return `<section class="kitchen-column ${c.id}"><header><div><h2>${c.title}</h2><small>${c.hint}</small></div><span>${items.length}</span></header><div class="ticket-list">${items.length?items.map(kitchenTicket).join(""):`<div class="column-empty">Sin pedidos</div>`}</div></section>`}).join("")}</div>`;
  }

  function kitchenTicket(o){ const label=o.status==="nuevo"?"Comenzar preparación":o.status==="preparacion"?"Marcar como listo":"Confirmar entrega"; return `<article class="kitchen-ticket"><div class="ticket-head"><div><span>#${o.id}</span><h3>Mesa ${o.table}</h3></div><time class="${o.elapsed>=20?"late":""}">◷ ${o.elapsed} min</time></div><div class="ticket-items">${o.items.map(i=>`<div><b>${i.qty}×</b><span>${i.name}${i.note?`<small>↳ ${i.note}</small>`:""}</span></div>`).join("")}</div><footer><span>${o.waiter} · ${o.createdAt}</span><button data-advance="${o.id}">${label} →</button></footer></article>`; }

  function renderCash(){
    const sales=state.orders.reduce((sum,o)=>sum+total(o),0);
    return `<div class="view-title"><div><p class="eyebrow">CIERRE Y COBROS</p><h1>Caja del servicio</h1><p>Ventas, cuentas abiertas y medios de pago en tiempo real.</p></div><button class="primary large">+ Registrar cobro</button></div><section class="cash-stats"><article><span>Venta del turno</span><strong>${money.format(sales+524000)}</strong><small>+12% frente al último lunes</small></article><article><span>Cuentas abiertas</span><strong>${state.orders.filter(o=>o.status!=="entregado").length}</strong><small>${money.format(sales)} pendientes</small></article><article><span>Ticket promedio</span><strong>${money.format((sales+524000)/18)}</strong><small>18 mesas cerradas</small></article></section><div class="cash-grid"><section class="panel"><div class="panel-head"><div><p class="eyebrow">CUENTAS ABIERTAS</p><h2>Mesas por cobrar</h2></div><span class="counter">En vivo</span></div>${state.orders.filter(o=>o.status!=="entregado").map(o=>`<div class="account-row"><span class="table-dot ocupada">${o.table}</span><div><strong>Mesa ${o.table}</strong><small>Comanda #${o.id} · ${count(o)} productos</small></div><b>${money.format(total(o))}</b><button data-pay="${o.id}">Cobrar</button></div>`).join("")}</section><section class="panel payment-panel"><p class="eyebrow">MEDIOS DE PAGO</p><h2>Distribución de ventas</h2><div class="donut"><div><strong>58%</strong><span>Tarjeta</span></div></div><div class="payment-legend"><span><i></i>Tarjeta <b>58%</b></span><span><i></i>Efectivo <b>27%</b></span><span><i></i>Transferencia <b>15%</b></span></div></section></div>`;
  }

  function render(){
    content.innerHTML=state.view==="panel"?renderPanel():state.view==="mesas"?renderTables():state.view==="comandas"?renderOrders():state.view==="cocina"?renderKitchen():renderCash();
    document.querySelectorAll("nav [data-view]").forEach(b=>b.classList.toggle("active",b.dataset.view===state.view));
    updateBadge();
  }

  function openOrder(table=state.selectedTable){ state.selectedTable=Number(table); state.draft=[]; state.category="Principales"; $("#modalTable").textContent=`Mesa ${state.selectedTable}`; $("#orderModal").classList.remove("hidden"); renderMenu(); renderDraft(); }
  function closeOrder(){ $("#orderModal").classList.add("hidden"); }
  function renderMenu(){ const cats=["Entradas","Principales","Postres","Bebidas"]; $("#categories").innerHTML=cats.map(c=>`<button class="${c===state.category?"active":""}" data-category="${c}">${c}</button>`).join(""); $("#menuGrid").innerHTML=menu.filter(i=>i.category===state.category).map(i=>`<button class="menu-item" data-add="${i.id}"><span><strong>${i.name}</strong><small>${i.detail}</small></span><b>${money.format(i.price)}</b><i>+</i></button>`).join(""); }
  function renderDraft(){ const qty=state.draft.reduce((s,i)=>s+i.qty,0), sum=state.draft.reduce((s,i)=>s+i.price*i.qty,0); $("#draftCount").textContent=`${qty} producto${qty===1?"":"s"}`; $("#draftTotal").textContent=money.format(sum); $("#sendOrder").disabled=!state.draft.length; $("#draftLines").innerHTML=state.draft.length?state.draft.map(i=>`<div class="draft-line"><div><strong>${i.name}</strong><small>${money.format(i.price*i.qty)}</small></div><div class="stepper"><button data-qty="${i.id}" data-delta="-1">−</button><span>${i.qty}</span><button data-qty="${i.id}" data-delta="1">+</button></div></div>`).join(""):`<div class="empty"><span>＋</span><p>Elegí productos del menú para comenzar la comanda.</p></div>`; }
  function addItem(id){ const item=menu.find(i=>i.id===Number(id)), found=state.draft.find(i=>i.id===item.id); if(found) found.qty++; else state.draft.push({...item,qty:1}); renderDraft(); }
  function changeQty(id,delta){ const item=state.draft.find(i=>i.id===Number(id)); if(!item)return; item.qty+=Number(delta); state.draft=state.draft.filter(i=>i.qty>0); renderDraft(); }

  async function sendOrder(){
    if(!state.draft.length)return;
    const order={id:Math.max(1086,...state.orders.map(o=>o.id))+1,table:state.selectedTable,waiter:"Ana",createdAt:new Date().toLocaleTimeString("es-AR",{hour:"2-digit",minute:"2-digit"}),status:"nuevo",elapsed:0,items:structuredClone(state.draft)};
    try { if(CONFIG.apiUrl){ const data=await api("",{method:"POST",body:JSON.stringify(order)}); order.id=data.order.id; } } catch {}
    state.orders.unshift(order); saveOrders(); closeOrder(); setView("cocina"); toast(`Comanda #${order.id} enviada a cocina`);
  }

  async function advance(id){
    const order=state.orders.find(o=>o.id===Number(id)); if(!order)return;
    order.status=order.status==="nuevo"?"preparacion":order.status==="preparacion"?"listo":"entregado";
    saveOrders(); render(); toast(order.status==="preparacion"?"Pedido en preparación":order.status==="listo"?"Pedido listo · Salón fue avisado":"Pedido entregado");
    try { if(CONFIG.apiUrl) await api("",{method:"PATCH",body:JSON.stringify({id:order.id,status:order.status})}); } catch {}
  }

  function setView(view){ state.view=view; render(); $("#sidebar").classList.remove("open"); }
  function statusName(status){ return ({libre:"Libre",ocupada:"Ocupada",reservada:"Reservada",limpieza:"Limpieza"})[status]; }

  function enterDemo(view){
    const profiles={
      mesas:{avatar:"AF",name:"Ana Ferreyra",role:"Encargada de salón",welcome:"Buenas noches, Ana",detail:"Lunes, 24 de agosto · Servicio cena"},
      cocina:{avatar:"MR",name:"Matías Ríos",role:"Jefe de cocina",welcome:"Cocina en servicio",detail:"Pase principal · Turno noche"},
      caja:{avatar:"LV",name:"Lucía Vidal",role:"Responsable de caja",welcome:"Buenas noches, Lucía",detail:"Caja principal · Servicio cena"}
    };
    const profile=profiles[view]||profiles.mesas;
    $("#userAvatar").textContent=profile.avatar;
    $("#userName").textContent=profile.name;
    $("#userRole").textContent=profile.role;
    $("#welcomeTitle").textContent=profile.welcome;
    $("#welcomeDetail").textContent=profile.detail;
    $("#demoEntry").classList.add("hidden");
    $("#app").classList.remove("hidden");
    setView(view);
  }

  function backToEntry(){
    $("#app").classList.add("hidden");
    $("#demoGuide").classList.add("hidden");
    $("#demoEntry").classList.remove("hidden");
    $("#sidebar").classList.remove("open");
  }

  document.addEventListener("click",(event)=>{
    const target=event.target.closest("button"); if(!target)return;
    if(target.dataset.entryView)enterDemo(target.dataset.entryView);
    if(target.dataset.view)setView(target.dataset.view);
    if(target.hasAttribute("data-new-order"))openOrder();
    if(target.dataset.table)openOrder(target.dataset.table);
    if(target.dataset.category){state.category=target.dataset.category;renderMenu();}
    if(target.dataset.add)addItem(target.dataset.add);
    if(target.dataset.qty)changeQty(target.dataset.qty,target.dataset.delta);
    if(target.dataset.advance)advance(target.dataset.advance);
    if(target.dataset.pay){const o=state.orders.find(x=>x.id===Number(target.dataset.pay));if(o){o.status="entregado";saveOrders();render();toast(`Cuenta de mesa ${o.table} registrada`);}}
  });

  $("#sendOrder").addEventListener("click",sendOrder);
  $("#closeModal").addEventListener("click",closeOrder);
  $("#orderModal").addEventListener("click",e=>{if(e.target.id==="orderModal")closeOrder();});
  $("#menuButton").addEventListener("click",()=>$("#sidebar").classList.toggle("open"));
  $("#backToEntry").addEventListener("click",backToEntry);
  $("#closeGuide").addEventListener("click",()=>$("#demoGuide").classList.add("hidden"));
  $("#tourButton").addEventListener("click",()=>$("#demoGuide").classList.remove("hidden"));
  $("#startTour").addEventListener("click",()=>{$("#demoGuide").classList.add("hidden");setView("mesas");toast("Elegí una mesa para cargar el pedido");});
  $("#resetDemo").addEventListener("click",()=>{state.orders=structuredClone(initialOrders);saveOrders();setView("panel");toast("Demo restaurada");});
  window.addEventListener("storage",e=>{if(e.key===STORAGE_KEY)syncFromStorage();});
  if(channel)channel.addEventListener("message",e=>{if(e.data?.type==="orders"){state.orders=e.data.orders;localStorage.setItem(STORAGE_KEY,JSON.stringify(state.orders));render();}});
  if(CONFIG.apiUrl){pullRemote();setInterval(pullRemote,CONFIG.refreshEveryMs||2500);}
  render();
})();
