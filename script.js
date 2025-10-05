// Simulação de banco de dados
let database = {
    users: {
        barber: [
            { id: 1, username: "joao", password: "123", name: "João Silva" },
            { id: 2, username: "carlos", password: "123", name: "Carlos Santos" }
        ],
        security: [
            { id: 1, username: "seguranca", password: "123", name: "Roberto Alves" },
            { id: 2, username: "vigilante", password: "123", name: "Marcos Oliveira" }
        ],
        admin: [
            { id: 1, username: "admin", password: "123", name: "Administrador" }
        ]
    },
    services: [
        { id: 1, name: "Corte de Cabelo", description: "Corte moderno e estilizado", price: 35.00, duration: 30 },
        { id: 2, name: "Barba", description: "Aparar, modelar e definir", price: 25.00, duration: 20 },
        { id: 3, name: "Combo Completo", description: "Corte + Barba + Sobrancelha", price: 50.00, duration: 60 },
        { id: 4, name: "Sobrancelha", description: "Design e modelagem", price: 15.00, duration: 15 }
    ],
    appointments: [
        { id: 1, clientName: "Roberto Silva", clientPhone: "(11) 99999-9999", serviceId: 1, date: getToday(), time: "10:00", status: "confirmed" },
        { id: 2, clientName: "Marcos Oliveira", clientPhone: "(11) 98888-8888", serviceId: 2, date: getToday(), time: "11:30", status: "confirmed" },
        { id: 3, clientName: "Antônio Santos", clientPhone: "(11) 97777-7777", serviceId: 3, date: getToday(), time: "13:00", status: "pending" },
        { id: 4, clientName: "Fernando Costa", clientPhone: "(11) 96666-6666", serviceId: 1, date: getTomorrow(), time: "14:30", status: "confirmed" },
        { id: 5, clientName: "Ricardo Almeida", clientPhone: "(11) 95555-5555", serviceId: 2, date: getTomorrow(), time: "16:00", status: "pending" }
    ],
    businessHours: {
        start: "09:00",
        end: "19:00",
        interval: 30
    }
};

// Funções auxiliares para datas
function getToday() {
    const today = new Date();
    return today.toISOString().split('T')[0];
}

function getTomorrow() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
}

function formatTime(timeString) {
    return timeString;
}

function formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

// Elementos DOM
const loginBtn = document.getElementById('loginBtn');
const loginModal = document.getElementById('loginModal');
const closeModal = document.querySelector('.close-modal');
const loginForm = document.getElementById('loginForm');
const userTypes = document.querySelectorAll('.user-type');
const loginMessage = document.getElementById('loginMessage');
const dashboard = document.getElementById('dashboard');
const logoutBtn = document.getElementById('logoutBtn');
const dashboardTitle = document.getElementById('dashboardTitle');
const appointmentsList = document.getElementById('appointmentsList');
const allAppointmentsList = document.getElementById('allAppointmentsList');
const servicesList = document.getElementById('servicesList');
const servicesManagementList = document.getElementById('servicesManagementList');
const serviceSelect = document.getElementById('serviceSelect');
const scheduleDate = document.getElementById('scheduleDate');
const timeSlots = document.getElementById('timeSlots');
const scheduleForm = document.getElementById('scheduleForm');
const scheduleMessage = document.getElementById('scheduleMessage');
const scheduleBtn = document.getElementById('scheduleBtn');
const heroScheduleBtn = document.getElementById('heroScheduleBtn');
const tabs = document.querySelectorAll('.tab');
const tabContents = document.querySelectorAll('.tab-content');
const addServiceBtn = document.getElementById('addServiceBtn');

// Variáveis de estado
let currentUserType = 'barber';
let currentUser = null;
let isLoggedIn = false;
let selectedTimeSlot = null;

// Variáveis para gerenciamento de serviços
let currentServiceId = null;
const serviceModal = document.getElementById('serviceModal');
const serviceForm = document.getElementById('serviceForm');

// Inicialização
document.addEventListener('DOMContentLoaded', function() {
    // Configurar data mínima para agendamento (hoje)
    scheduleDate.min = getToday();
    
    // Carregar serviços
    loadServices();
    loadServicesForSelect();
    
    // Carregar agendamentos iniciais
    updateDashboardStats();
    loadAppointments();
    loadAllAppointments();
    loadServicesManagement();
    
    // Event Listeners
    setupEventListeners();
});

// Configuração de Event Listeners
function setupEventListeners() {
    loginBtn.addEventListener('click', openLoginModal);
    closeModal.addEventListener('click', closeLoginModal);
    loginForm.addEventListener('submit', handleLogin);
    logoutBtn.addEventListener('click', handleLogout);
    scheduleBtn.addEventListener('click', scrollToSchedule);
    heroScheduleBtn.addEventListener('click', scrollToSchedule);
    scheduleForm.addEventListener('submit', handleSchedule);
    scheduleDate.addEventListener('change', generateTimeSlots);
    addServiceBtn.addEventListener('click', openAddServiceModal);
    serviceForm.addEventListener('submit', handleServiceSubmit);
    
    tabs.forEach(tab => {
        tab.addEventListener('click', switchTab);
    });
    
    userTypes.forEach(type => {
        type.addEventListener('click', () => {
            userTypes.forEach(t => t.classList.remove('active'));
            type.classList.add('active');
            currentUserType = type.getAttribute('data-type');
        });
    });
    
    // Fechar modais ao clicar fora
    window.addEventListener('click', (e) => {
        if (e.target === loginModal) closeLoginModal();
        if (e.target === serviceModal) closeServiceModal();
    });
}

// ===== FUNÇÕES DE AUTENTICAÇÃO =====
function openLoginModal() {
    loginModal.style.display = 'flex';
}

function closeLoginModal() {
    loginModal.style.display = 'none';
    loginMessage.style.display = 'none';
    loginForm.reset();
}

function handleLogin(e) {
    e.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    // Verificar credenciais
    const user = database.users[currentUserType].find(u => u.username === username && u.password === password);
    
    if (user) {
        // Login bem-sucedido
        currentUser = user;
        isLoggedIn = true;
        loginMessage.textContent = 'Login realizado com sucesso!';
        loginMessage.style.color = 'var(--success)';
        loginMessage.style.display = 'block';
        
        setTimeout(() => {
            closeLoginModal();
            showDashboard();
        }, 1000);
    } else {
        // Login falhou
        loginMessage.textContent = 'Usuário ou senha incorretos!';
        loginMessage.style.color = 'var(--danger)';
        loginMessage.style.display = 'block';
    }
}

function handleLogout() {
    isLoggedIn = false;
    currentUser = null;
    dashboard.style.display = 'none';
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ===== FUNÇÕES DO DASHBOARD =====
function showDashboard() {
    // Atualizar título do dashboard
    let title = '';
    switch(currentUserType) {
        case 'barber':
            title = 'Dashboard do Barbeiro';
            break;
        case 'security':
            title = 'Dashboard de Segurança';
            break;
        case 'admin':
            title = 'Dashboard Administrativo';
            break;
    }
    dashboardTitle.textContent = title;
    
    // Atualizar estatísticas
    updateDashboardStats();
    
    // Carregar dados
    loadAppointments();
    loadAllAppointments();
    loadServicesManagement();
    
    // Mostrar dashboard
    dashboard.style.display = 'block';
    dashboard.scrollIntoView({ behavior: 'smooth' });
}

function updateDashboardStats() {
    const today = getToday();
    const todayAppointments = database.appointments.filter(a => a.date === today);
    const confirmedToday = todayAppointments.filter(a => a.status === 'confirmed' || a.status === 'completed');
    const completedAppointments = database.appointments.filter(a => a.status === 'completed');
    
    // Atualizar estatísticas
    document.getElementById('todayAppointments').textContent = todayAppointments.length;
    document.getElementById('servedClients').textContent = completedAppointments.length;
    
    // Calcular faturamento do dia
    let todayRevenue = 0;
    confirmedToday.forEach(appointment => {
        const service = database.services.find(s => s.id === appointment.serviceId);
        if (service) todayRevenue += service.price;
    });
    document.getElementById('todayRevenue').textContent = formatCurrency(todayRevenue);
    
    // Calcular avaliação média (simulada)
    document.getElementById('averageRating').textContent = '4.8';
    
    // Estatísticas mensais (simuladas)
    document.getElementById('monthAppointments').textContent = database.appointments.length;
    document.getElementById('monthRevenue').textContent = formatCurrency(todayRevenue * 20);
    document.getElementById('popularService').textContent = 'Corte de Cabelo';
    document.getElementById('cancelRate').textContent = '5%';
}

function switchTab(e) {
    const tabId = e.target.getAttribute('data-tab');
    
    // Atualizar tabs
    tabs.forEach(tab => tab.classList.remove('active'));
    e.target.classList.add('active');
    
    // Atualizar conteúdo
    tabContents.forEach(content => content.classList.remove('active'));
    document.getElementById(`${tabId}Tab`).classList.add('active');
}

// ===== FUNÇÕES DE AGENDAMENTOS =====
function loadAppointments() {
    const today = getToday();
    const todayAppointments = database.appointments.filter(a => a.date === today);
    
    appointmentsList.innerHTML = '';
    
    if (todayAppointments.length === 0) {
        appointmentsList.innerHTML = '<tr><td colspan="5" style="text-align: center;">Nenhum agendamento para hoje</td></tr>';
        return;
    }
    
    todayAppointments.forEach(appointment => {
        const service = database.services.find(s => s.id === appointment.serviceId);
        const statusClass = `status-${appointment.status}`;
        let statusText = getStatusText(appointment.status);
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${appointment.clientName}</td>
            <td>${service ? service.name : 'N/A'}</td>
            <td>${appointment.time}</td>
            <td><span class="status-badge ${statusClass}">${statusText}</span></td>
            <td class="action-buttons">
                ${getAppointmentActions(appointment)}
            </td>
        `;
        appointmentsList.appendChild(row);
    });
}

function loadAllAppointments() {
    allAppointmentsList.innerHTML = '';
    
    if (database.appointments.length === 0) {
        allAppointmentsList.innerHTML = '<tr><td colspan="6" style="text-align: center;">Nenhum agendamento cadastrado</td></tr>';
        return;
    }
    
    // Ordenar por data (mais recente primeiro)
    const sortedAppointments = [...database.appointments].sort((a, b) => {
        return new Date(b.date) - new Date(a.date);
    });
    
    sortedAppointments.forEach(appointment => {
        const service = database.services.find(s => s.id === appointment.serviceId);
        const statusClass = `status-${appointment.status}`;
        let statusText = getStatusText(appointment.status);
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${appointment.clientName}</td>
            <td>${service ? service.name : 'N/A'}</td>
            <td>${formatDate(appointment.date)}</td>
            <td>${appointment.time}</td>
            <td><span class="status-badge ${statusClass}">${statusText}</span></td>
            <td class="action-buttons">
                ${getAppointmentActions(appointment)}
            </td>
        `;
        allAppointmentsList.appendChild(row);
    });
}

function getStatusText(status) {
    switch(status) {
        case 'confirmed': return 'Confirmado';
        case 'pending': return 'Pendente';
        case 'canceled': return 'Cancelado';
        case 'completed': return 'Concluído';
        default: return status;
    }
}

function getAppointmentActions(appointment) {
    switch(appointment.status) {
        case 'confirmed':
            return `
                <button class="action-btn btn-success" onclick="completeAppointment(${appointment.id})">
                    <i class="fas fa-check"></i>
                </button>
                <button class="action-btn btn-danger" onclick="cancelAppointment(${appointment.id})">
                    <i class="fas fa-times"></i>
                </button>
            `;
        case 'pending':
            return `
                <button class="action-btn btn-success" onclick="confirmAppointment(${appointment.id})">
                    <i class="fas fa-check"></i>
                </button>
                <button class="action-btn btn-danger" onclick="cancelAppointment(${appointment.id})">
                    <i class="fas fa-times"></i>
                </button>
            `;
        case 'completed':
        case 'canceled':
            return `
                <button class="action-btn btn-danger" onclick="deleteAppointment(${appointment.id})">
                    <i class="fas fa-trash"></i>
                </button>
            `;
        default:
            return '';
    }
}

// Funções de ação para agendamentos
function confirmAppointment(id) {
    const appointment = database.appointments.find(a => a.id === id);
    if (appointment) {
        appointment.status = 'confirmed';
        updateDashboardStats();
        loadAppointments();
        loadAllAppointments();
    }
}

function completeAppointment(id) {
    const appointment = database.appointments.find(a => a.id === id);
    if (appointment) {
        appointment.status = 'completed';
        updateDashboardStats();
        loadAppointments();
        loadAllAppointments();
    }
}

function cancelAppointment(id) {
    const appointment = database.appointments.find(a => a.id === id);
    if (appointment) {
        appointment.status = 'canceled';
        updateDashboardStats();
        loadAppointments();
        loadAllAppointments();
    }
}

function deleteAppointment(id) {
    if (confirm('Tem certeza que deseja excluir este agendamento?')) {
        database.appointments = database.appointments.filter(a => a.id !== id);
        updateDashboardStats();
        loadAppointments();
        loadAllAppointments();
    }
}

// ===== FUNÇÕES DE SERVIÇOS =====
function loadServices() {
    servicesList.innerHTML = '';
    
    database.services.forEach(service => {
        const card = document.createElement('div');
        card.className = 'service-card';
        card.innerHTML = `
            <div class="service-img">
                <i class="fas fa-cut"></i>
            </div>
            <div class="service-content">
                <h3>${service.name}</h3>
                <p>${service.description}</p>
                <p><strong>${formatCurrency(service.price)}</strong></p>
                <p><small>Duração: ${service.duration} min</small></p>
                ${isLoggedIn && currentUser.role === 'admin' ? `
                    <div class="service-actions">
                        <button class="btn btn-warning btn-sm" onclick="editService(${service.id})">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-danger btn-sm" onclick="deleteService(${service.id})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                ` : ''}
            </div>
        `;
        servicesList.appendChild(card);
    });
}

function loadServicesForSelect() {
    serviceSelect.innerHTML = '<option value="">Selecione um serviço</option>';
    
    database.services.forEach(service => {
        const option = document.createElement('option');
        option.value = service.id;
        option.textContent = `${service.name} - ${formatCurrency(service.price)}`;
        serviceSelect.appendChild(option);
    });
}

function loadServicesManagement() {
    servicesManagementList.innerHTML = '';
    
    if (database.services.length === 0) {
        servicesManagementList.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center;">
                    Nenhum serviço cadastrado. Clique em "Adicionar Serviço" para começar.
                </td>
            </tr>
        `;
        return;
    }
    
    database.services.forEach(service => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${service.name}</td>
            <td>${service.description || '-'}</td>
            <td>${formatCurrency(service.price)}</td>
            <td>${service.duration} min</td>
            <td class="action-buttons">
                <button class="action-btn btn-warning" onclick="editService(${service.id})">
                    <i class="fas fa-edit"></i> Editar
                </button>
                <button class="action-btn btn-danger" onclick="deleteService(${service.id})">
                    <i class="fas fa-trash"></i> Excluir
                </button>
            </td>
        `;
        servicesManagementList.appendChild(row);
    });
}

// ===== GERENCIAMENTO DE SERVIÇOS =====
function openAddServiceModal() {
    console.log('Botão Adicionar Serviço clicado!');
    
    if (!isLoggedIn) {
        alert('Faça login primeiro');
        return;
    }
    
    if (currentUser.role !== 'admin') {
        alert('Apenas administradores podem gerenciar serviços');
        return;
    }
    
    document.getElementById('serviceModalTitle').textContent = 'Adicionar Serviço';
    serviceForm.reset();
    document.getElementById('serviceId').value = '';
    currentServiceId = null;
    
    // Mostrar o modal
    serviceModal.style.display = 'flex';
}

function editService(id) {
    if (!isLoggedIn || currentUser.role !== 'admin') {
        alert('Apenas administradores podem editar serviços');
        return;
    }
    
    const service = database.services.find(s => s.id === id);
    if (!service) {
        alert('Serviço não encontrado');
        return;
    }
    
    document.getElementById('serviceModalTitle').textContent = 'Editar Serviço';
    document.getElementById('serviceId').value = service.id;
    document.getElementById('serviceName').value = service.name;
    document.getElementById('serviceDescription').value = service.description || '';
    document.getElementById('servicePrice').value = service.price;
    document.getElementById('serviceDuration').value = service.duration;
    
    currentServiceId = id;
    serviceModal.style.display = 'flex';
}

function closeServiceModal() {
    serviceModal.style.display = 'none';
    serviceForm.reset();
    currentServiceId = null;
}

function handleServiceSubmit(e) {
    e.preventDefault();
    
    const serviceData = {
        name: document.getElementById('serviceName').value.trim(),
        description: document.getElementById('serviceDescription').value.trim(),
        price: parseFloat(document.getElementById('servicePrice').value),
        duration: parseInt(document.getElementById('serviceDuration').value)
    };
    
    // Validações
    if (!serviceData.name) {
        alert('Nome do serviço é obrigatório');
        return;
    }
    
    if (serviceData.price <= 0) {
        alert('Preço deve ser maior que zero');
        return;
    }
    
    if (serviceData.duration <= 0) {
        alert('Duração deve ser maior que zero');
        return;
    }
    
    if (currentServiceId) {
        updateService(currentServiceId, serviceData);
    } else {
        addService(serviceData);
    }
}

function addService(serviceData) {
    const newService = {
        id: database.services.length > 0 ? Math.max(...database.services.map(s => s.id)) + 1 : 1,
        ...serviceData,
        created_at: new Date().toISOString()
    };
    
    database.services.push(newService);
    loadServices();
    loadServicesForSelect();
    loadServicesManagement();
    closeServiceModal();
    alert('Serviço adicionado com sucesso!');
}

function updateService(id, serviceData) {
    const serviceIndex = database.services.findIndex(s => s.id === id);
    
    if (serviceIndex === -1) {
        alert('Serviço não encontrado');
        return;
    }
    
    database.services[serviceIndex] = {
        ...database.services[serviceIndex],
        ...serviceData
    };
    
    loadServices();
    loadServicesForSelect();
    loadServicesManagement();
    closeServiceModal();
    alert('Serviço atualizado com sucesso!');
}

function deleteService(id) {
    if (!isLoggedIn || currentUser.role !== 'admin') {
        alert('Apenas administradores podem excluir serviços');
        return;
    }
    
    if (!confirm('Tem certeza que deseja excluir este serviço?')) {
        return;
    }
    
    const serviceInUse = database.appointments.some(a => a.serviceId === id);
    
    if (serviceInUse) {
        alert('Não é possível excluir este serviço pois existem agendamentos vinculados a ele.');
        return;
    }
    
    database.services = database.services.filter(s => s.id !== id);
    loadServices();
    loadServicesForSelect();
    loadServicesManagement();
    alert('Serviço excluído com sucesso!');
}

// ===== FUNÇÕES DE AGENDAMENTO =====
function generateTimeSlots() {
    const date = scheduleDate.value;
    if (!date) return;
    
    timeSlots.innerHTML = '';
    selectedTimeSlot = null;
    
    // Gerar horários baseados no horário de funcionamento
    const startTime = database.businessHours.start;
    const endTime = database.businessHours.end;
    const interval = database.businessHours.interval;
    
    const start = new Date(`2000-01-01T${startTime}`);
    const end = new Date(`2000-01-01T${endTime}`);
    
    let currentTime = new Date(start);
    
    while (currentTime < end) {
        const timeString = currentTime.toTimeString().substring(0, 5);
        
        // Verificar se o horário já está ocupado
        const isBooked = database.appointments.some(a => 
            a.date === date && a.time === timeString && 
            (a.status === 'confirmed' || a.status === 'pending')
        );
        
        const button = document.createElement('button');
        button.type = 'button';
        button.className = `time-slot ${isBooked ? 'disabled' : ''}`;
        button.textContent = timeString;
        button.disabled = isBooked;
        
        if (!isBooked) {
            button.addEventListener('click', function() {
                document.querySelectorAll('.time-slot.selected').forEach(slot => {
                    slot.classList.remove('selected');
                });
                this.classList.add('selected');
                selectedTimeSlot = timeString;
            });
        }
        
        timeSlots.appendChild(button);
        currentTime.setMinutes(currentTime.getMinutes() + interval);
    }
}

function handleSchedule(e) {
    e.preventDefault();
    
    if (!selectedTimeSlot) {
        showScheduleMessage('Por favor, selecione um horário', 'danger');
        return;
    }
    
    const clientName = document.getElementById('clientName').value;
    const clientPhone = document.getElementById('clientPhone').value;
    const serviceId = parseInt(serviceSelect.value);
    const date = scheduleDate.value;
    
    // Criar novo agendamento
    const newAppointment = {
        id: database.appointments.length + 1,
        clientName,
        clientPhone,
        serviceId,
        date,
        time: selectedTimeSlot,
        status: 'pending'
    };
    
    database.appointments.push(newAppointment);
    
    showScheduleMessage('Agendamento realizado com sucesso! Entraremos em contato para confirmação.', 'success');
    scheduleForm.reset();
    selectedTimeSlot = null;
    
    // Atualizar slots de tempo
    generateTimeSlots();
    
    // Atualizar dashboard se estiver logado
    if (isLoggedIn) {
        updateDashboardStats();
        loadAppointments();
        loadAllAppointments();
    }
}

function showScheduleMessage(message, type) {
    scheduleMessage.textContent = message;
    scheduleMessage.style.color = type === 'success' ? 'var(--success)' : 'var(--danger)';
    scheduleMessage.style.display = 'block';
    
    setTimeout(() => {
        scheduleMessage.style.display = 'none';
    }, 5000);
}

function scrollToSchedule() {
    document.getElementById('schedule').scrollIntoView({ behavior: 'smooth' });
}
