(function(){
const $ = (s, root=document) => root.querySelector(s);
const $$ = (s, root=document) => [...root.querySelectorAll(s)];
const now = new Date();
const stamp = (offset=0) => { 
    const d=new Date(now.getTime() - offset*60000);
    return d.toLocaleString(
        'pt-BR', {day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}); 
};
const isoDate = () => { 
    const d=new Date();
    return `
            + ${d.getFullYear()}
            - ${String(d.getMonth()+1).padStart(2,'0')}
            - ${String(d.getDate()).padStart(2,'0')}`; 
};

/* Mudar essas variáveis para ficarem dinâmicas, i.e acesso ao bd */
let repeaters = [
    {id:'REP-001',name:'Torre A · Centro',location:'São Paulo, SP',status:'ok',temp:42.6,voltage:12.2,signal:78,updated:'há 8 s',last:stamp(8),lat:-23.5505,lng:-46.6333},
    {id:'REP-002',name:'Torre B · Norte',location:'Guarulhos, SP',status:'warn',temp:62.4,voltage:11.9,signal:41,updated:'há 12 s',last:stamp(12),lat:-23.4543,lng:-46.5337},
    {id:'REP-003',name:'Laboratório',location:'Campus · Bloco 3',status:'ok',temp:35.8,voltage:12.4,signal:92,updated:'há 5 s',last:stamp(5),lat:-23.5614,lng:-46.7302},
    {id:'REP-004',name:'Torre C · Sul',location:'Santo André, SP',status:'bad',temp:null,voltage:null,signal:0,updated:'há 18 min',last:stamp(18),lat:-23.6639,lng:-46.5383},
    {id:'REP-005',name:'Torre D · Oeste',location:'Osasco, SP',status:'ok',temp:39.1,voltage:12.1,signal:84,updated:'há 16 s',last:stamp(16),lat:-23.5325,lng:-46.7917}
];
let alerts = [
    {id:1,title:'Temperatura acima do limite',description:'Leitura de 62,4 °C · limite de demonstração: 60 °C',device:'REP-002',severity:'critical',time:stamp(3),ack:false},
    {id:2,title:'Equipamento sem comunicação',description:'Sem leitura recebida há mais de 15 minutos',device:'REP-004',severity:'critical',time:stamp(18),ack:false},
    {id:3,title:'Tensão abaixo do ideal',description:'Última leitura válida: 11,9 V',device:'REP-002',severity:'warning',time:stamp(24),ack:true},
    {id:4,title:'Inspeção registrada',description:'Manutenção preventiva concluída',device:'REP-003',severity:'info',time:stamp(91),ack:true}
];
let maintenances = [
    {id:'MAN-0104',device:'REP-003',type:'Preventiva',tech:'Marina Costa',date:isoDate(),note:'Inspeção visual do gabinete e conferência dos conectores.'},
    {id:'MAN-0103',device:'REP-001',type:'Inspeção',tech:'Lucas Almeida',date:isoDate(),note:'Verificação de temperatura e alimentação.'},
    {id:'MAN-0102',device:'REP-002',type:'Corretiva',tech:'Rafael Souza',date:isoDate(),note:'Verificar elevação de temperatura no próximo ciclo.'}
];
let activeView='dashboard';

/* Dinamizar viewnames tbm */
const viewNames={dashboard:'Visão geral',repeaters:'Repetidoras',alerts:'Central de alertas',maintenance:'Manutenções',reports:'Relatórios',requirements:'Stack & requisitos'};
const esc = s => String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const stLabel = s => ({ok:'Normal',warn:'Atenção',bad:'Offline'}[s]||s);
const stClass = s => ({ok:'status-ok',warn:'status-warn',bad:'status-bad'}[s]||'status-neutral');
const sevLabel = s=>({critical:'Crítico',warning:'Atenção',info:'Informativo'}[s]||s);
const sevClass = s=>({critical:'status-bad',warning:'status-warn',info:'status-neutral'}[s]||'status-neutral');
const online = () => repeaters.filter(r=>r.status!=='bad').length;
const healthy = () => repeaters.filter(r=>r.status==='ok').length;
const activeAlerts = () => alerts.filter(a=>!a.ack).length;
function showToast(msg,kind='ok'){
    const el=document.createElement('div');
    el.className = 'toast'+(kind==='error'?' error':'');
    el.textContent=msg;
    $('#toastRegion').appendChild(el);
    setTimeout(()=>el.remove(),3600);
}





function FetchRepeaters(){
    /* Faz uma requisição ao servidor e recebe uma lista de repetidoras, se existirem. */
    /* 
    
    */
    // Possíveis endereços
    const accept_urls = ["http://localhost:5500", "http://127.0.0.1:5500", "http://localhost:3000"];
    
    /* Fazer um bloco try catch para escolher o endereço ativo do server. */
    
    // Endereço das repetidoras no server.
    const server_url = '/repeaters';

    // 
    const response = fetch(server_url);

    //
    const repeaters = response.json();
    return repeaters;    
}





function go(view){
    activeView=view;
    $$('.view').forEach(e=>e.classList.toggle('active',e.id==='view-'+view));
    $$('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===view));
    $('#crumbTitle').textContent=viewNames[view]||'TRACE-REP';
    renderAll();window.scrollTo({top:0,behavior:'smooth'});
}
function repeaterStatusBadge(r){
    return `<span class="status ${stClass(r.status)}">${stLabel(r.status)}</span>`;
}
function renderStats(){
    const stats = [
        {label:'Repetidoras cadastradas',value:repeaters.length,foot:'Equipamentos no inventário',icon:'▤',tone:'blue'},
        {label:'Funcionamento normal',value:healthy(),foot:`${repeaters.length?Math.round(healthy()/repeaters.length*100):0}% do inventário`,icon:'✓',tone:'green'},
        {label:'Precisam de atenção',value:repeaters.filter(r=>r.status==='warn').length,foot:'Verifique temperatura e tensão',icon:'!',tone:'amber'},
        {label:'Sem comunicação',value:repeaters.filter(r=>r.status==='bad').length,foot:'Último contato expirado',icon:'⌁',tone:'red'}
];
    $('#statsGrid').innerHTML = stats.map(s=>`
        <article class="card stat-card">
            <div class="stat-top">
                <div class="stat-label">${s.label}</div>
                <div class="stat-icon tone-${s.tone}">${s.icon}</div>
            </div>
            <div class="stat-value">${s.value}</div>
            <div class="stat-foot">${s.foot}</div>
        </article>`).join('');
    $('#navAlertCount').textContent=activeAlerts();
    $('#navAlertCount').style.display=activeAlerts()?'':'none';
}

function renderChart(){
    let n=Number($('#chartRange')?.value||12);
    let labs=n===6?['−5h','−4h','−3h','−2h','−1h','Agora']:n===24?['−24h','−20h','−16h','−12h','−8h','−4h','Agora']:['−12h','−10h','−8h','−6h','−4h','−2h','Agora'];
    let temp=n===6?[38,40,43,46,52,45]:n===24?[34,39,36,42,44,51,45]:[36,39,38,43,48,62,45];
    let sig=n===6?[89,87,83,80,65,82]:n===24?[94,91,93,86,81,70,84]:[90,91,88,86,77,41,84];
    const svg=$('#telemetryChart');
    const W=620,H=235,L=42,R=12,T=13,B=32,plotW=W-L-R,plotH=H-T-B;
    const x=i=>L+(i/(labs.length-1))*plotW;
    const yT=v=>T+(70-v)/70*plotH;
    const yS=v=>T+(100-v)/100*plotH;
    const lines=[0,20,40,60].map(v=>{let y=yT(v);return `<line x1="${L}" y1="${y}" x2="${W-R}" y2="${y}" stroke="var(--border)" stroke-dasharray="3 4"/><text x="${L-9}" y="${y+3}" fill="var(--muted)" font-size="9" text-anchor="end">${v}°</text>`}).join('');
    const points=(arr,fn)=>arr.map((v,i)=>`${x(i)},${fn(v)}`).join(' ');
    const labels=labs.map((l,i)=>`<text x="${x(i)}" y="${H-10}" fill="var(--muted)" font-size="9" text-anchor="middle">${l}</text>`).join('');
    const tempPts=points(temp,yT),sigPts=points(sig,yS);
    const circles=(arr,fn,color)=>arr.map((v,i)=>`<circle cx="${x(i)}" cy="${fn(v)}" r="3" fill="${color}" stroke="var(--surface)" stroke-width="1.5"/>`).join('');
    svg.innerHTML=`${lines}<polyline points="${tempPts}" fill="none" stroke="#5b78ee" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/><polyline points="${sigPts}" fill="none" stroke="#25b889" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>${circles(temp,yT,'#5b78ee')}${circles(sig,yS,'#25b889')}${labels}`;
}

function renderHealth(){
    const total=repeaters.length||1;
    const h=[
        {name:'Equipamentos comunicando',desc:'Conectividade recebida',value:`${online()} de ${repeaters.length}`,pct:online()/total*100,color:'var(--green)',tone:'green'},
        {name:'Temperatura sob controle',desc:'Abaixo do limite demonstrativo',value:`${repeaters.filter(r=>r.status==='ok').length} equipamentos`,pct:healthy()/total*100,color:'var(--green)',tone:'green'},
        {name:'Alertas não reconhecidos',desc:'Ocorrências aguardando revisão',value:String(activeAlerts()),pct:Math.min(100,activeAlerts()/Math.max(1,alerts.length)*100),color:activeAlerts()?'var(--amber)':'var(--green)',tone:activeAlerts()?'amber':'green'}
    ];
 $('#healthSummary').innerHTML = h.map(a=>`
    <div class="health-row">
        <div class="health-symbol tone-${a.tone}">◉</div>
        <div class="health-info">
            <div class="health-name">${a.name}</div>
            <div class="health-desc">${a.desc}</div>
            <div class="health-bar">
                <span style="width:${Math.max(3,a.pct)}%;background:${a.color}"></span>
            </div>
        </div>
        <div class="health-value">${a.value}</div>
    </div>`).join('');
 $('#reportHealth').innerHTML = h.map(a=>`
    <div class="health-row">
        <div class="health-symbol tone-${a.tone}">◉</div>
        <div class="health-info">
            <div class="health-name">${a.name}</div>
            <div class="health-desc">${a.desc}</div>
            <div class="health-bar">
                <span style="width:${Math.max(3,a.pct)}%;background:${a.color}"></span>
            </div>
        </div>
        <div class="health-value">${a.value}</div>
    </div>`).join('');
}

function renderDashboardTable(){
    const rows=repeaters.slice(0,4);
    $('#dashboardRepeaters').innerHTML = rows.map(r=>`
        <tr>
            <td>
                <div class="device-cell">
                    <div class="device-symbol">▤</div>
                    <div>
                        <div class="device-id">${esc(r.id)}</div>
                        <div class="device-location">${esc(r.name)}</div>
                    </div>
                </div>
            </td>
            <td>${repeaterStatusBadge(r)}</td>
            <td>${r.temp===null?'—':r.temp.toFixed(1)+' °C'}</td>
            <td>${r.voltage===null?'—':r.voltage.toFixed(1)+' V'}</td>
            <td style="color:var(--muted)">${esc(r.updated)}</td>
        </tr>`).join('');
}

function renderRecentAlerts(){
    const items = alerts.slice().sort((a,b)=>a.ack-b.ack).
    slice(0,4);$('#recentAlerts').innerHTML = items.length?items.map(a=>`
        <div class="alert-item">
            <div class="alert-symbol ${a.severity==='critical'?'tone-red':a.severity==='warning'?'tone-amber':'tone-blue'}">
                ${a.severity==='critical'?'!':a.severity==='warning'?'⚠':'i'}
            </div>
            <div class="alert-copy">
                <div class="alert-title">${esc(a.title)}</div>
                <div class="alert-detail">${esc(a.device)} · ${esc(a.description)}</div>
            </div>
            <div class="alert-time">${esc(a.time)}</div>
        </div>`).join(''):'<div class="empty-state">Nenhum evento registrado.</div>';
}

function renderRepeaters(){
    const q=($('#repeaterSearch')?.value||'').trim().toLowerCase();
    const f=$('#statusFilter')?.value||'all';
    const list=repeaters.filter(r=>(f==='all'||r.status===f)&&`${r.id} ${r.name} ${r.location}`.toLowerCase().includes(q));
    $('#allRepeaters').innerHTML = list.map(r=>`
        <tr>
            <td>
                <div class="device-cell">
                    <div class="device-symbol">▤</div>
                    <div>
                        <div class="device-id">${esc(r.id)}</div>
                        <div class="device-location">${esc(r.name)}</div>
                    </div>
                </div>
            </td>
            <td>${esc(r.location)}</td>
            <td>${repeaterStatusBadge(r)}</td>
            <td>${r.temp===null?'—':r.temp.toFixed(1)+' °C'}</td>
            <td>${r.voltage===null?'—':r.voltage.toFixed(1)+' V'}</td>
            <td>
                <div style="display:flex;align-items:center;gap:8px">
                    <div class="health-bar" style="width:58px;margin:0">
                        <span style="width:${r.signal}%;background:${r.signal<50?'var(--amber)':'var(--green)'}"></span>
                    </div>
                    <span>${r.signal}%</span>
                </div>
            </td>
            <td>
                <button class="action-link" data-detail="${esc(r.id)}">Detalhes</button>
                 · 
                <button class="action-link" data-maint-device="${esc(r.id)}">Manutenção</button>
            </td>
        </tr>`).join('');
        $('#repeaterEmpty').style.display=list.length?'none':'block';
}

function renderAlerts(){
    const f=$('#alertFilter')?.value||'all';
    const sv=$('#alertSeverity')?.value||'all';
    const list=alerts.filter(a=>(f==='all'||(f==='active'?!a.ack:a.ack))&&(sv==='all'||a.severity===sv)).sort((a,b)=>a.ack-b.ack);
    $('#alertsTable').innerHTML = list.map(a=>`
        <tr>
            <td>
                <div class="device-id">${esc(a.title)}</div>
                <div class="device-location">${esc(a.description)}</div>
            </td>
            <td>
                <span class="device-id">${esc(a.device)}</span>
            </td>
            <td>
                <span class="status ${sevClass(a.severity)}">${sevLabel(a.severity)}</span>
            </td>
            <td>${esc(a.time)}</td>
            <td>
                <span class="status ${a.ack?'status-neutral':'status-warn'}">${a.ack?'Reconhecido':'Pendente'}</span>
            </td>
            <td>
                ${a.ack?'<span style="color:var(--muted);font-size:10px">Concluído</span>':`<button class="action-link" data-ack="${a.id}">Reconhecer</button>`}
            </td>
        </tr>`).join('');
        $('#alertsEmpty').style.display = list.length?'none':'block';
        $('#navAlertCount').textContent=activeAlerts();
        $('#navAlertCount').style.display=activeAlerts()?'':'none';
}

function renderMaintenance(){
    const q=($('#maintenanceSearch')?.value||'').toLowerCase();
    const list=maintenances.filter(m=>`${m.id} ${m.device} ${m.tech} ${m.type} ${m.note}`.toLowerCase().includes(q));
    $('#maintenanceTable').innerHTML = list.map(m=>`
        <tr>
            <td>
                <span class="device-id">${esc(m.id)}</span>
            </td>
            <td>${esc(m.device)}</td>
            <td>
                <span class="status status-neutral">${esc(m.type)}</span>
            </td>
            <td>${esc(m.tech)}</td>
            <td>${esc(m.date)}</td>
            <td style="white-space:normal;min-width:170px;max-width:260px;color:var(--muted);line-height:1.5">${esc(m.note)}</td>
        </tr>`).join('');
    $('#maintenanceEmpty').style.display=list.length?'none':'block';
    $('#maintenanceStats').innerHTML=[
        {label:'Serviços registrados',value:maintenances.length,tone:'blue',icon:'⌁',foot:'Nesta demonstração'},
        {label:'Preventivas',value:maintenances.filter(m=>m.type==='Preventiva').length,tone:'green',icon:'✓',foot:'Manutenção planejada'},
        {label:'Corretivas',value:maintenances.filter(m=>m.type==='Corretiva').length,tone:'amber',icon:'⚒',foot:'Atuação sobre falha'},
        {label:'Equipamentos atendidos',value:new Set(maintenances.map(m=>m.device)).size,tone:'blue',icon:'▤',foot:'IDs distintos'}
    ].map(s=>`
        <article class="card stat-card">
            <div class="stat-top">
                <div class="stat-label">${s.label}</div>
                <div class="stat-icon tone-${s.tone}">${s.icon}</div>
            </div>
            <div class="stat-value">${s.value}</div>
            <div class="stat-foot">${s.foot}</div>
        </article>`).join('');
}

function renderReports(){
    let count={critical:alerts.filter(a=>a.severity==='critical').length,warning:alerts.filter(a=>a.severity==='warning').length,info:alerts.filter(a=>a.severity==='info').length};
    $('#reportStats').innerHTML = [
        {label:'Disponibilidade ilustrativa',value:`${repeaters.length?Math.round(online()/repeaters.length*100):0}%`,note:'Equipamentos comunicando'},
        {label:'Alertas pendentes',value:activeAlerts(),note:'Exigem revisão'},
        {label:'Manutenções registradas',value:maintenances.length,note:'Histórico de demonstração'}
    ].map((s,i)=>`
        <article class="card report-metric">
            <div class="stat-label">${s.label}</div>
            <div class="report-value">${s.value}</div>
            <div class="report-label">${s.note}</div>
        </article>`).join('');
    let max=Math.max(1,count.critical,count.warning,count.info);
    $('#alertBars').innerHTML=[
        ['Crítico',count.critical],
        ['Atenção',count.warning],
        ['Informativo',count.info]
    ].map(([l,v])=>`
        <div class="bar-col">
            <div class="bar-val">${v}</div>
            <div class="bar" style="height:${Math.max(5,v/max*130)}px;background:${l==='Crítico'?'linear-gradient(180deg,#ef8f96,#dc5962)':l==='Atenção'?'linear-gradient(180deg,#efc26c,#cb861a)':'linear-gradient(180deg,#8ca0ff,#5b78ee)'}"></div>
            <div class="bar-label">${l}</div>
        </div>`).join('');
}

function renderAll(){
    renderStats();
    renderChart();
    renderHealth();
    renderDashboardTable();
    renderRecentAlerts();
    renderRepeaters();
    renderAlerts();
    renderMaintenance();
    renderReports();
}

function openModal(title,subtitle,bodyHtml,onSubmit){
    $('#modalTitle').textContent=title;
    $('#modalSubtitle').textContent=subtitle;
    $('#modalBody').innerHTML=bodyHtml;
    $('#modalBackdrop').classList.add('open');
    $('#modalBackdrop').dataset.open='1';
    const form=$('#modalForm');
    if(form)form.addEventListener('submit',e=>{e.preventDefault();onSubmit(new FormData(form));});
    setTimeout(()=>$('#modalBody input, #modalBody select, #modalBody textarea')?.focus(),20);
}

function closeModal(){
    $('#modalBackdrop').classList.remove('open');
    $('#modalBackdrop').dataset.open='';
}

function repeaterModal(){
    openModal('Cadastrar repetidora','Adicione um equipamento ao inventário de demonstração.',`
        <form id="modalForm">
            <div class="form-grid" style="margin-top:0">
                <div class="field">
                    <label for="rId">Identificador *</label>
                    <input id="rId" name="id" placeholder="REP-006" required maxlength="18">
                </div>
                <div class="field">
                    <label for="rName">Nome do equipamento *</label>
                    <input id="rName" name="name" placeholder="Torre E · Leste" required>
                </div>
                <div class="field full">
                    <label for="rLocation">Localização *</label>
                    <input id="rLocation" name="location" placeholder="Cidade, UF ou local do campus" required>
                </div>
                <div class="field">
                    <label for="rTemp">Temperatura inicial (°C)</label>
                    <input id="rTemp" name="temp" type="number" min="-20" max="150" step="0.1" value="36">
                </div>
                <div class="field">
                    <label for="rVoltage">Tensão inicial (V)</label>
                    <input id="rVoltage" name="voltage" type="number" min="0" max="60" step="0.1" value="12.1">
                </div>
            </div>
            <div class="form-actions">
                <button type="button" class="btn" data-close-modal>Cancelar</button>
                <button type="submit" class="btn btn-primary">Cadastrar equipamento</button>
            </div>
        </form>`,fd=>{let id=String(fd.get('id')).trim().toUpperCase();
            if(repeaters.some(r=>r.id.toLowerCase()===id.toLowerCase())){
                showToast('Esse identificador já existe. Use outro ID.','error');
                return;}
            let temp=Number(fd.get('temp')), voltage=Number(fd.get('voltage'));
            repeaters.unshift({id,name:String(fd.get('name')).trim(),location:String(fd.get('location')).trim(),status:temp>60||voltage<11?'warn':'ok',temp,voltage,signal:76,updated:'agora',last:stamp(0)});
            closeModal();
            renderAll();
            showToast(`${id} cadastrada no protótipo.`);});
}

function maintenanceModal(device=''){
    openModal('Registrar manutenção','Registre uma intervenção vinculada à repetidora.',`
        <form id="modalForm">
            <div class="form-grid" style="margin-top:0">
                <div class="field">
                    <label for="mDevice">Repetidora *</label>
                    <select id="mDevice" name="device" required>
                        ${repeaters.map(r=>`<option value="${esc(r.id)}" ${r.id===device?'selected':''}>${esc(r.id)} · ${esc(r.name)}</option>`).join('')}
                    </select>
                </div>
                <div class="field">
                    <label for="mType">Tipo de serviço *</label>
                    <select id="mType" name="type" required>
                        <option>Preventiva</option>
                        <option>Corretiva</option>
                        <option>Instalação</option>
                        <option>Inspeção</option>
                    </select>
                </div>
                <div class="field">
                    <label for="mTech">Nome do técnico *</label>
                    <input id="mTech" name="tech" placeholder="Nome completo" required>
                </div>
                <div class="field">
                    <label for="mDate">Data *</label>
                        <input id="mDate" name="date" type="date" value="${isoDate()}" required>
                </div>
                <div class="field full">
                    <label for="mNote">Descrição do serviço *</label>
                    <textarea id="mNote" name="note" placeholder="Descreva o que foi verificado, corrigido ou substituído…" required></textarea>
                </div>
            </div>
            <div class="form-actions">
                <button type="button" class="btn" data-close-modal>Cancelar</button>
                <button type="submit" class="btn btn-primary">Salvar registro</button>
            </div>
        </form>`, fd=>{
            let serial=104+maintenances.length;
            maintenances.unshift({
                id:'MAN-'+String(serial).padStart(4,'0'),
                device:String(fd.get('device')),
                type:String(fd.get('type')),
                tech:String(fd.get('tech')).trim(),
                date:String(fd.get('date')),
                note:String(fd.get('note')).trim()});
            closeModal();
            renderAll();
            showToast('Manutenção registrada nesta sessão de demonstração.');});
}

function detailModal(id){
    const r=repeaters.find(x=>x.id===id);
    if(!r)return;
    openModal(`${r.id} · Detalhes`,'Informações do equipamento de demonstração.',`
        <div class="grid" style="gap:12px;grid-template-columns:repeat(2,minmax(0,1fr))">
            <div class="callout">
                <div class="stat-label">Estado atual</div>
                <div style="margin-top:9px">${repeaterStatusBadge(r)}</div>
            </div>
            <div class="callout">
                <div class="stat-label">Sinal simulado</div>
                <div class="report-value" style="font-size:23px;margin:8px 0 0">${r.signal}%</div>
            </div>
            <div class="callout">
                <div class="stat-label">Temperatura</div>
                <div class="report-value" style="font-size:23px;margin:8px 0 0">${r.temp===null?'—':r.temp.toFixed(1)+'°'}</div>
            </div>
            <div class="callout">
                <div class="stat-label">Tensão</div>
                <div class="report-value" style="font-size:23px;margin:8px 0 0">${r.voltage===null?'—':r.voltage.toFixed(1)+' V'}</div>
            </div>
        </div>
        <div class="metric-list">
            <div class="metric-row">
                <span>Nome</span><strong>${esc(r.name)}</strong>
            </div>
            <div class="metric-row">
                <span>Localização</span><strong>${esc(r.location)}</strong>
            </div>
            <div class="metric-row">
                <span>Última atualização</span><strong>${esc(r.updated)}</strong>
            </div>
            <div class="metric-row">
                <span>Coordenadas ilustrativas</span><strong>${r.lat.toFixed(4)}, ${r.lng.toFixed(4)}</strong>
            </div>
        </div>
        <div class="notice">Leituras e coordenadas são dados demonstrativos, não medições reais.</div>
        <div class="form-actions">
            <button class="btn" data-close-modal>Fechar</button>
            <button class="btn btn-primary" id="detailMaintenance" data-device="${esc(id)}">Registrar manutenção</button>
        </div>`,()=>{});
}

function simulateFault(){
    const candidates=repeaters.filter(r=>r.status==='ok');
    const r=candidates.length?candidates[0]:repeaters[0];
    if(!r){
        showToast('Cadastre uma repetidora antes de simular falhas.','error');
        return;}
    const type=Math.floor(Math.random()*3);
    let item;
    if(type===0){
        r.status='warn';
        r.temp=+(63+Math.random()*4).toFixed(1);
        r.signal=Math.max(20,r.signal-35);
        r.updated='agora';
        item={title:'Temperatura crítica simulada',description:`Leitura de ${r.temp} °C acima do limite demonstrativo`,device:r.id,severity:'critical',time:stamp(0),ack:false};}
    else if(type===1){
        r.status='bad';
        r.temp=null;
        r.voltage=null;
        r.signal=0;
        r.updated='sem comunicação';
        item={title:'Perda de comunicação simulada',description:'Equipamento colocado offline manualmente',device:r.id,severity:'critical',time:stamp(0),ack:false};}
    else{
        r.status='warn';
        r.voltage=10.4;
        r.signal=Math.max(15,r.signal-25);
        r.updated='agora';
        item={title:'Tensão baixa simulada',description:'Leitura de 10,4 V abaixo do limite de demonstração',device:r.id,severity:'warning',time:stamp(0),ack:false};}
    alerts.unshift({id:Math.max(0,...alerts.map(a=>a.id))+1,...item});
    renderAll();
    showToast(`Falha simulada em ${r.id}. Um novo alerta foi criado.`);
}

function exportCSV(filename,rows){
    const csv=rows.map(row=>row.map(v=>'"'+String(v??'').replace(/"/g,'""')+'"').join(';')).join('\r\n');
    const blob=new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8;'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');
    a.href=url;
    a.download=filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showToast('Arquivo CSV gerado com os dados atuais.');
}

function exportRepeaters(){
    exportCSV('trace-rep-repetidoras.csv',
        [['ID','Nome','Localização','Status','Temperatura °C','Tensão V','Sinal simulado %','Última atualização'],
        ...repeaters.map(r=>[r.id,r.name,r.location,stLabel(r.status),r.temp,r.voltage,r.signal,r.updated])]);
}

function exportMaintenances(){
    exportCSV('trace-rep-manutencoes.csv',
        [['Protocolo','Repetidora','Tipo','Técnico','Data','Observação'],
        ...maintenances.map(m=>[m.id,m.device,m.type,m.tech,m.date,m.note])]);
}

function exportReport(){
    exportCSV('trace-rep-relatorio.csv',
        [['Tipo','Identificador','Status/Tipo','Data','Descrição'],
        ...repeaters.map(r=>['Repetidora',r.id,stLabel(r.status),r.updated,`${r.name}; temp ${r.temp}; tensao ${r.voltage}; sinal ${r.signal}%`]),
        ...alerts.map(a=>['Alerta',a.device,sevLabel(a.severity),a.time,`${a.title} · ${a.description} · ${a.ack?'Reconhecido':'Pendente'}`]),
        ...maintenances.map(m=>['Manutenção',m.device,m.type,m.date,`${m.id} · ${m.tech} · ${m.note}`])]);
}

// Main navigation and delegated controls.

document.addEventListener('click',e=>{
    const nav = e.target.closest('[data-view]');
    if(nav){
        go(nav.dataset.view);
        $('#mobileNav').style.display='none';
        return;
    }
    const goto = e.target.closest('[data-goto]');
    if(goto){
        go(goto.dataset.goto);
        return;
    }
    const detail = e.target.closest('[data-detail]');
    if(detail){
        detailModal(detail.dataset.detail);
        return;
    }
    const mdev = e.target.closest('[data-maint-device]');
    if(mdev){
        maintenanceModal(mdev.dataset.maintDevice);
        return;
    }
    const ack = e.target.closest('[data-ack]');
    if(ack){
        const a=alerts.find(a=>a.id===Number(ack.dataset.ack));
        if(a){
            a.ack=true;
            renderAll();
            showToast('Alerta marcado como reconhecido.');
        }
        return;
    }
    if(e.target.closest('[data-close-modal]')){
        closeModal();return;
    }
    if(e.target.id==='detailMaintenance'){
        const id = e.target.dataset.device;
        closeModal();
        maintenanceModal(id);
        return;
    }
});

/* Event listeners */
$('#newRepeater').addEventListener('click',repeaterModal);
$('#newMaintenance').addEventListener('click',()=>maintenanceModal());
$('#simulateFault').addEventListener('click',simulateFault);
$('#alertSimulate').addEventListener('click',simulateFault);
$('#repeatersExport').addEventListener('click',exportRepeaters);
$('#dashboardExport').addEventListener('click',exportReport);
$('#reportExport').addEventListener('click',exportReport);
$('#maintenanceExport').addEventListener('click',exportMaintenances);
$('#chartRange').addEventListener('change',renderChart);
$('#repeaterSearch').addEventListener('input',renderRepeaters);
$('#statusFilter').addEventListener('change',renderRepeaters);
$('#alertFilter').addEventListener('change',renderAlerts);
$('#alertSeverity').addEventListener('change',renderAlerts);
$('#maintenanceSearch').addEventListener('input',renderMaintenance);

$('#ackAll').addEventListener('click',
    ()=>{let n=activeAlerts();
    alerts.forEach(a=>a.ack=true);
    renderAll();
    showToast(n?`${n} alerta(s) reconhecido(s).`:'Não havia alertas pendentes.');
});
$('#topAlerts').addEventListener('click',()=>go('alerts'));
$('#closeModal').addEventListener('click',closeModal);
$('#modalBackdrop').addEventListener('click',e=>{if(e.target===$('#modalBackdrop'))closeModal();});
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeModal();});

$('#mobileToggle').addEventListener('click',
    ()=>{const m=$('#mobileNav');
        m.style.display=m.style.display==='none'?'flex':'none';
});
$('#mobileNav').innerHTML = 
$$('#sideNav [data-view]').map(b=>
    `<button class = "nav-btn${b.dataset.view==='dashboard'?' active':''}" 
    data-view = "${b.dataset.view}">${b.innerHTML}</button>`).join('');
renderAll();
})();