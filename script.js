const SUPABASE_URL = 'https://mwhexkzrvpekgvxucjkq.supabase.co';
const SUPABASE_KEY = 'sb_publishable_SykH6teO3stuHA_ScXC7_A_BD63W4Av';
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const URL_AVATAR_PADRAO = 'https://cdn-icons-png.flaticon.com/512/149/149071.png';
let bancoDeDados = [];
let idEmEdicao = null;

async function carregarDados() {
    const { data, error } = await _supabase.from('colaboradores').select('*').order('id', { ascending: true });
    if (!error) { 
        bancoDeDados = data; 
        renderizarInicial(); // Renderiza tudo de uma vez
    }
}

// Renderiza a árvore completa uma única vez
function construirTudo(dados, chefeId = null) {
    const equipe = dados.filter(pessoa => pessoa.id_chefe === chefeId);
    if (equipe.length === 0) return '';

    // No início, apenas o topo (chefeId === null) ou o Conselho (id 1) começam visíveis
    const deveComeçarAberto = (chefeId === null || chefeId === 1);
    
    let html = chefeId === null ? 
        '<ul class="organograma-arvore">' : 
        `<ul class="equipe ${deveComeçarAberto ? 'visivel' : 'oculta'}" id="equipe-${chefeId}">`;

    equipe.forEach(pessoa => {
        const temSubordinados = dados.some(d => d.id_chefe === pessoa.id);
        const fotoPerfil = pessoa.foto && pessoa.foto.trim() !== "" ? pessoa.foto : URL_AVATAR_PADRAO;

        html += `
            <li class="ramificacao" id="li-${pessoa.id}">
                <div class="cartao-org ${pessoa.id === 1 ? 'expandido' : ''}" 
                     id="card-${pessoa.id}"
                     onclick="${temSubordinados ? `alternarEquipe(event, ${pessoa.id}, ${pessoa.id_chefe})` : ''}">
                    
                    <div class="botoes-acao">
                        <button class="btn-editar" onclick="preencherModalEditar(event, ${pessoa.id})">✎</button>
                        <button class="btn-excluir" onclick="excluirColaborador(event, ${pessoa.id})">&times;</button>
                    </div>

                    <div class="cartao-frente">
                        <div class="avatar"><img src="${fotoPerfil}" alt="foto"></div>
                        <div class="info-principal">
                            <h3 class="nome">${pessoa.nome}</h3>
                            <p class="cargo">${pessoa.cargo}</p>
                            <p class="email-card">${pessoa.email || ''}</p>
                        </div>
                    </div>
                </div>
                ${construirTudo(dados, pessoa.id)}
            </li>
        `;
    });
    return html + '</ul>';
}

function renderizarInicial() {
    document.getElementById('container-organograma').innerHTML = construirTudo(bancoDeDados);
}

// A MÁGICA: Manipula o DOM diretamente sem recarregar
function alternarEquipe(event, id, idChefe) {
    if (event.target.tagName === 'BUTTON') return;

    const cardClicado = document.getElementById(`card-${id}`);
    const listaFilhos = document.getElementById(`equipe-${id}`);
    
    // 1. Identificar se vamos abrir ou fechar
    const abrindo = cardClicado.classList.contains('expandido') ? false : true;

    if (abrindo) {
        // FECHAR IRMÃOS (Lógica de Acordeão)
        const liPai = cardClicado.closest('ul');
        const todosOsCardsIrmaos = liPai.querySelectorAll(':scope > li > .cartao-org');
        const todasAsEquipesIrmas = liPai.querySelectorAll(':scope > li > .equipe');

        todosOsCardsIrmaos.forEach(card => {
            card.classList.remove('expandido');
            card.classList.add('mini'); // Comprime os outros
        });

        todasAsEquipesIrmas.forEach(eq => eq.classList.add('oculta'));

        // ABRIR O CLICADO
        cardClicado.classList.add('expandido');
        cardClicado.classList.remove('mini');
        if (listaFilhos) {
            listaFilhos.classList.remove('oculta');
            listaFilhos.classList.add('visivel');
        }
    } else {
        // APENAS FECHAR
        cardClicado.classList.remove('expandido');
        if (listaFilhos) {
            listaFilhos.classList.add('oculta');
            listaFilhos.classList.remove('visivel');
        }
        
        // Remover estado 'mini' dos irmãos se ninguém estiver aberto
        const liPai = cardClicado.closest('ul');
        const irmaos = liPai.querySelectorAll(':scope > li > .cartao-org');
        irmaos.forEach(card => card.classList.remove('mini'));
    }
}

// --- CRUD (Mantido e Estável) ---
function abrirModal(idManual = null) {
    idEmEdicao = idManual;
    const select = document.getElementById('input-chefe');
    document.querySelector('#modal-cadastro h2').innerText = idEmEdicao ? "Editar Colaborador" : "Novo Cadastro";
    select.innerHTML = '<option value="">Sem Líder (Topo)</option>';
    bancoDeDados.sort((a,b) => a.nome.localeCompare(b.nome)).forEach(p => {
        if (p.id !== idEmEdicao) select.innerHTML += `<option value="${p.id}">${p.nome}</option>`;
    });
    document.getElementById('modal-cadastro').classList.remove('oculta');
}

function fecharModal() { 
    document.getElementById('modal-cadastro').classList.add('oculta'); 
    document.getElementById('form-cadastro').reset(); 
    idEmEdicao = null; 
}

function preencherModalEditar(event, id) {
    event.stopPropagation();
    const p = bancoDeDados.find(item => item.id === id);
    if (p) {
        abrirModal(id);
        document.getElementById('input-nome').value = p.nome;
        document.getElementById('input-cargo').value = p.cargo;
        document.getElementById('input-email').value = p.email || '';
        document.getElementById('input-chefe').value = p.id_chefe || '';
        document.getElementById('input-inscricao').value = p.inscricao || '';
        document.getElementById('input-celular').value = p.celular || '';
        document.getElementById('input-nascimento').value = p.nascimento || '';
        document.getElementById('input-admissao').value = p.admissao || '';
        document.getElementById('input-foto').value = p.foto || '';
    }
}

document.getElementById('form-cadastro').addEventListener('submit', async function(e) {
    e.preventDefault();
    const dados = {
        id_chefe: document.getElementById('input-chefe').value ? parseInt(document.getElementById('input-chefe').value) : null,
        nome: document.getElementById('input-nome').value,
        cargo: document.getElementById('input-cargo').value,
        email: document.getElementById('input-email').value || null,
        inscricao: document.getElementById('input-inscricao').value || null,
        celular: document.getElementById('input-celular').value || null,
        nascimento: document.getElementById('input-nascimento').value || null,
        admissao: document.getElementById('input-admissao').value || null,
        foto: document.getElementById('input-foto').value || null
    };
    if (idEmEdicao) await _supabase.from('colaboradores').update(dados).eq('id', idEmEdicao);
    else await _supabase.from('colaboradores').insert([dados]);
    fecharModal(); carregarDados(); // Aqui recarrega tudo porque houve mudança no banco
});

async function excluirColaborador(event, id) {
    event.stopPropagation();
    if (id === 1 || !confirm("Deseja excluir?")) return;
    const p = bancoDeDados.find(item => item.id === id);
    await _supabase.from('colaboradores').update({ id_chefe: p.id_chefe }).eq('id_chefe', id);
    await _supabase.from('colaboradores').delete().eq('id', id);
    carregarDados();
}

carregarDados();