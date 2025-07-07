import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import { getFirestore, collection, doc, addDoc, getDocs, onSnapshot, setDoc, updateDoc, arrayUnion, query } from 'firebase/firestore';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { User, BookUser, Users, Book, Calendar, Link2, Search, FileText, Bot, LogIn, PlusCircle, XCircle, CheckCircle, AlertTriangle, Briefcase, Users2, Mail, Lock, LayoutDashboard, Megaphone, CalendarPlus, Phone, Home, BadgeInfo, Wallet, ChevronLeft, ChevronRight, Send } from 'lucide-react';

// --- CONFIGURAÇÃO DO FIREBASE ---
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

// --- INICIALIZAÇÃO DO FIREBASE ---
let app, auth, db;
try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
} catch (e) {
  console.error("Erro na inicialização do Firebase:", e.message);
}

// --- DADOS DE AMOSTRA ---
const sampleTeachers = [ { name: 'Ana Silva', specialty: 'Matemática', contractHours: 40, schedule: { 'Segunda-09:00': 'Turma A' }, attested: false, cpf: '111.222.333-44', phone: '11987654321', address: 'Rua das Flores, 123' }, { name: 'Carlos Souza', specialty: 'Português', contractHours: 36, schedule: { 'Terça-14:00': 'Turma C' }, attested: true, cpf: '222.333.444-55', phone: '11987654322', address: 'Avenida Principal, 456' }, ];
const sampleStudents = [ { name: 'João Pereira', warnings: 'Nenhum', attested: false, monthlyFeeStatus: 'paid', cpf: '333.444.555-66', phone: '11912345678', address: 'Travessa dos Pássaros, 789' }, { name: 'Maria Oliveira', warnings: 'Laudo de dislexia', attested: false, monthlyFeeStatus: 'due', cpf: '444.555.666-77', phone: '11912345679', address: 'Largo das Árvores, 101' }, ];
const sampleSubjects = [ { name: 'Cálculo I', coursePlan: 'Plano de ensino...', workload: 60 }, { name: 'Gramática Avançada', coursePlan: 'Estudo aprofundado...', workload: 40 }, ];
const sampleTurmas = [ { name: 'Turma de Lógica 101', area: 'SEDUC', teacherId: null, studentIds: [], subjectIds: [] }, { name: 'Curso de Redação', area: 'Curso Balcão', teacherId: null, studentIds: [], subjectIds: [] }, ];
const sampleFuncionarios = [ { name: 'Roberto Lima', role: 'Secretário', contractHours: 40 }, ];
const sampleEvents = [ { name: 'Reunião de Pais', date: new Date(new Date().getFullYear(), new Date().getMonth(), 25).toISOString().split('T')[0], description: 'Reunião bimestral.', linkedTurmas: [] }, { name: 'Festa Junina', date: new Date(new Date().getFullYear(), 5, 24).toISOString().split('T')[0], description: 'Comemoração.', linkedTurmas: [] }, ];
const sampleAnnouncements = [ { title: 'Início das Matrículas', content: 'As matrículas para o próximo semestre começarão na próxima segunda-feira.', createdAt: new Date(), target: 'all' } ];

// --- COMPONENTES DA UI ---
const Modal = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center p-4 border-b"><h3 className="text-xl font-bold text-gray-800">{title}</h3><button onClick={onClose} className="text-gray-500 hover:text-gray-800"><XCircle size={24} /></button></div>
                <div className="p-6 overflow-y-auto">{children}</div>
            </div>
        </div>
    );
};

const Notification = ({ message, type, onDismiss }) => {
    if (!message) return null;
    const baseClasses = "fixed top-5 right-5 flex items-center p-4 rounded-lg shadow-lg z-50";
    const typeClasses = { success: "bg-green-100 text-green-800", error: "bg-red-100 text-red-800", warning: "bg-yellow-100 text-yellow-800", };
    const Icon = { success: CheckCircle, error: XCircle, warning: AlertTriangle }[type];
    return (
        <div className={`${baseClasses} ${typeClasses[type]}`}><Icon className="mr-3" size={20} /><span>{message}</span><button onClick={onDismiss} className="ml-4 text-lg font-bold">&times;</button></div>
    );
};

// --- COMPONENTES DE PÁGINA / CONTEÚDO ---

const DashboardSection = ({ data, user, showNotification }) => {
    const [announcementTitle, setAnnouncementTitle] = useState('');
    const [announcementContent, setAnnouncementContent] = useState('');
    const studentsWithDueFees = useMemo(() => data.students.filter(s => s.monthlyFeeStatus === 'due').length, [data.students]);
    const teachersOnLeave = useMemo(() => data.teachers.filter(t => t.attested).length, [data.teachers]);

    const handleAddAnnouncement = async () => {
        if (!announcementTitle || !announcementContent) { showNotification("Título e conteúdo do aviso são obrigatórios.", "warning"); return; }
        try {
            const collectionPath = `artifacts/${appId}/public/data/announcements`;
            await addDoc(collection(db, collectionPath), { title: announcementTitle, content: announcementContent, createdAt: new Date(), target: 'all' });
            showNotification("Aviso publicado com sucesso!", "success");
            setAnnouncementTitle('');
            setAnnouncementContent('');
        } catch (error) { showNotification("Erro ao publicar aviso.", "error"); console.error(error); }
    };

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-800">Dashboard</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-lg shadow flex items-center space-x-4"><div className="p-3 bg-blue-100 rounded-full"><Users size={24} className="text-blue-600" /></div><div><p className="text-sm text-gray-500">Total de Alunos</p><p className="text-2xl font-bold text-gray-800">{data.students.length}</p></div></div>
                <div className="bg-white p-6 rounded-lg shadow flex items-center space-x-4"><div className="p-3 bg-green-100 rounded-full"><Briefcase size={24} className="text-green-600" /></div><div><p className="text-sm text-gray-500">Total de Professores</p><p className="text-2xl font-bold text-gray-800">{data.teachers.length}</p></div></div>
                <div className="bg-white p-6 rounded-lg shadow flex items-center space-x-4"><div className="p-3 bg-red-100 rounded-full"><Wallet size={24} className="text-red-600" /></div><div><p className="text-sm text-gray-500">Alunos Inadimplentes</p><p className="text-2xl font-bold text-gray-800">{studentsWithDueFees}</p></div></div>
                <div className="bg-white p-6 rounded-lg shadow flex items-center space-x-4"><div className="p-3 bg-yellow-100 rounded-full"><AlertTriangle size={24} className="text-yellow-600" /></div><div><p className="text-sm text-gray-500">Professores de Atestado</p><p className="text-2xl font-bold text-gray-800">{teachersOnLeave}</p></div></div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-lg shadow">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Mural de Avisos</h3>
                    {user.role === 'admin' && (<div className="mb-4 p-4 border rounded-lg space-y-2"><input value={announcementTitle} onChange={e => setAnnouncementTitle(e.target.value)} placeholder="Título do Aviso" className="input-style"/><textarea value={announcementContent} onChange={e => setAnnouncementContent(e.target.value)} placeholder="Conteúdo do aviso..." className="input-style" rows="2"></textarea><button onClick={handleAddAnnouncement} className="btn-primary">Publicar Aviso Geral</button></div>)}
                    <div className="space-y-4 max-h-48 overflow-y-auto">{data.announcements.sort((a,b) => b.createdAt.toDate() - a.createdAt.toDate()).map(ann => (<div key={ann.id} className="flex items-start space-x-4"><div className="p-3 bg-purple-100 rounded-lg flex-shrink-0"><Megaphone size={20} className="text-purple-600" /></div><div><p className="font-semibold text-gray-700">{ann.title}</p><p className="text-sm text-gray-500">{ann.content}</p></div></div>))}</div>
                </div>
                 <div className="bg-white p-6 rounded-lg shadow">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Informações Rápidas</h3>
                    <div className="space-y-4">
                        <div className="flex items-start space-x-4"><div className="p-3 bg-indigo-100 rounded-lg flex-shrink-0"><Users2 size={20} className="text-indigo-600" /></div><div><p className="font-semibold text-gray-700">Total de Turmas</p><p className="text-lg text-gray-600">{data.turmas.length} turmas ativas.</p></div></div>
                        {user.role === 'teacher' && <div className="flex items-start space-x-4"><div className="p-3 bg-cyan-100 rounded-lg flex-shrink-0"><Calendar size={20} className="text-cyan-600" /></div><div><p className="font-semibold text-gray-700">Próximas Aulas</p><p className="text-sm text-gray-500">Simulação: Aula de Matemática às 14h.</p></div></div>}
                    </div>
                </div>
            </div>
        </div>
    );
};

const AddDataSection = ({ userType, showNotification }) => {
    const [dataType, setDataType] = useState('teacher');
    const [formData, setFormData] = useState({ attested: false });
    const [formKey, setFormKey] = useState(1);

    const handleAdd = async () => {
        if (userType !== 'admin') { showNotification("Acesso negado.", "error"); return; }
        if (!formData.name) { showNotification("O nome é obrigatório.", "warning"); return; }
        const collectionName = `${dataType}s`;
        const collectionPath = `artifacts/${appId}/public/data/${collectionName}`;
        try {
            await addDoc(collection(db, collectionPath), { ...formData, createdAt: new Date() });
            showNotification(`${dataType.charAt(0).toUpperCase() + dataType.slice(1)} adicionado(a) com sucesso!`, 'success');
            setFormData({ attested: false });
            setFormKey(prevKey => prevKey + 1);
        } catch (error) { console.error("Erro ao adicionar documento: ", error); showNotification("Falha ao adicionar dados.", "error"); }
    };
    
    const renderForm = () => {
        const attestedCheckbox = (<div className="flex items-center"><input id="attested" type="checkbox" checked={!!formData.attested} onChange={e => setFormData({...formData, attested: e.target.checked})} className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" /><label htmlFor="attested" className="ml-2 block text-sm text-gray-900">De Atestado?</label></div>);
        const personalDataFields = (<><input onChange={e => setFormData({...formData, cpf: e.target.value})} placeholder="CPF" className="input-style" /><input onChange={e => setFormData({...formData, phone: e.target.value})} placeholder="Telefone" className="input-style" /><input onChange={e => setFormData({...formData, address: e.target.value})} placeholder="Endereço" className="input-style" /></>);

        switch(dataType) {
            case 'teacher': return (<><input onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Nome do Professor" className="input-style" /><input onChange={e => setFormData({...formData, specialty: e.target.value})} placeholder="Especialidade" className="input-style" /><input type="number" onChange={e => setFormData({...formData, contractHours: parseInt(e.target.value, 10) || 0})} placeholder="Horas Contratadas" className="input-style" />{personalDataFields}{attestedCheckbox}</>);
            case 'student': return (<><input onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Nome do Aluno" className="input-style" /><textarea onChange={e => setFormData({...formData, warnings: e.target.value})} placeholder="Laudos ou Avisos" className="input-style"></textarea><select onChange={e => setFormData({...formData, monthlyFeeStatus: e.target.value})} defaultValue="" className="input-style"><option value="" disabled>Situação da Mensalidade</option><option value="paid">Em dia</option><option value="due">Atrasado</option><option value="exempt">Isento</option></select>{personalDataFields}{attestedCheckbox}</>);
            case 'subject': return (<><input onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Nome da Matéria/UC" className="input-style" /><textarea onChange={e => setFormData({...formData, coursePlan: e.target.value})} placeholder="Plano de Curso (Link ou Texto)" className="input-style"></textarea><input type="number" onChange={e => setFormData({...formData, workload: parseInt(e.target.value, 10) || 0})} placeholder="Carga Horária Total" className="input-style" /></>);
            case 'turma': return (<><input onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Nome da Turma" className="input-style" /><input onChange={e => setFormData({...formData, area: e.target.value})} placeholder="Área (Ex: SEDUC, EJA)" className="input-style" /></>);
            case 'funcionario': return (<><input onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Nome do Funcionário" className="input-style" /><input onChange={e => setFormData({...formData, role: e.target.value})} placeholder="Cargo" className="input-style" /><input type="number" onChange={e => setFormData({...formData, contractHours: parseInt(e.target.value, 10) || 0})} placeholder="Horas Contratadas" className="input-style" />{personalDataFields}</>);
            case 'event': return (<><input onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Nome do Evento" className="input-style" /><input type="date" onChange={e => setFormData({...formData, date: e.target.value})} className="input-style" /><textarea onChange={e => setFormData({...formData, description: e.target.value})} placeholder="Descrição do Evento" className="input-style"></textarea></>);
            default: return null;
        }
    }
    
    return (
        <div className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-800">1. Adicionar Dados Gerais</h2>
            <div className="flex space-x-2 border-b flex-wrap">
                <button onClick={() => setDataType('teacher')} className={`py-2 px-4 ${dataType === 'teacher' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500'}`}>Professor</button>
                <button onClick={() => setDataType('student')} className={`py-2 px-4 ${dataType === 'student' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500'}`}>Aluno</button>
                <button onClick={() => setDataType('subject')} className={`py-2 px-4 ${dataType === 'subject' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500'}`}>Matéria</button>
                <button onClick={() => setDataType('turma')} className={`py-2 px-4 ${dataType === 'turma' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500'}`}>Turma</button>
                <button onClick={() => setDataType('funcionario')} className={`py-2 px-4 ${dataType === 'funcionario' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500'}`}>Funcionário</button>
                <button onClick={() => setDataType('event')} className={`py-2 px-4 ${dataType === 'event' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500'}`}>Evento</button>
            </div>
            <div key={formKey} className="bg-white p-6 rounded-lg shadow space-y-3">
                {renderForm()}
                <button onClick={handleAdd} disabled={userType !== 'admin'} className="btn-primary disabled:bg-gray-400 disabled:cursor-not-allowed"><PlusCircle size={18} /> Adicionar</button>
            </div>
        </div>
    );
};

const CalendarView = ({ events }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const daysOfWeek = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const changeMonth = (amount) => { setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + amount, 1)); };

    const renderMonthView = () => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const firstDayOfMonth = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const days = Array.from({ length: firstDayOfMonth }).map((_, i) => <div key={`empty-${i}`} className="border p-2 h-24"></div>);
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month, day);
            const dateString = date.toISOString().split('T')[0];
            const dayEvents = events.filter(e => e.date === dateString);
            days.push(
                <div key={day} className="border p-2 h-24 flex flex-col">
                    <span className="font-bold">{day}</span>
                    <div className="flex-grow overflow-y-auto text-xs">{dayEvents.map(e => <div key={e.id} className="bg-blue-100 text-blue-800 rounded px-1 mt-1 truncate">{e.name}</div>)}</div>
                </div>
            );
        }
        return days;
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-800">{currentDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}</h3>
                <div className="flex items-center space-x-2">
                    <button onClick={() => changeMonth(-1)} className="p-2 rounded-full hover:bg-gray-200"><ChevronLeft size={20} /></button>
                    <button onClick={() => setCurrentDate(new Date())} className="text-sm font-medium px-3 py-1 rounded-md hover:bg-gray-200 border">Hoje</button>
                    <button onClick={() => changeMonth(1)} className="p-2 rounded-full hover:bg-gray-200"><ChevronRight size={20} /></button>
                </div>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center font-medium text-gray-600">{daysOfWeek.map(day => <div key={day}>{day}</div>)}</div>
            <div className="grid grid-cols-7 gap-1 mt-1">{renderMonthView()}</div>
        </div>
    );
};

const EventsAndAnnouncementsSection = ({ data, user, showNotification }) => {
    const [announcementTitle, setAnnouncementTitle] = useState('');
    const [announcementContent, setAnnouncementContent] = useState('');
    const [announcementTarget, setAnnouncementTarget] = useState('all');

    const handleSendAnnouncement = async () => {
        if (!announcementTitle || !announcementContent) { showNotification("Título e conteúdo são obrigatórios.", "warning"); return; }
        try {
            const collectionPath = `artifacts/${appId}/public/data/announcements`;
            await addDoc(collection(db, collectionPath), { title: announcementTitle, content: announcementContent, target: announcementTarget, createdAt: new Date() });
            showNotification(`Alerta enviado para ${announcementTarget}! (Simulação)`, "success");
            setAnnouncementTitle('');
            setAnnouncementContent('');
        } catch (error) { showNotification("Erro ao enviar alerta.", "error"); }
    };

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-800">Eventos e Avisos</h2>
            <CalendarView events={data.events} />
            <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Criar e Enviar Aviso</h3>
                <div className="space-y-4">
                    <input value={announcementTitle} onChange={e => setAnnouncementTitle(e.target.value)} placeholder="Título do Aviso" className="input-style"/>
                    <textarea value={announcementContent} onChange={e => setAnnouncementContent(e.target.value)} placeholder="Conteúdo do aviso..." className="input-style" rows="3"></textarea>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Enviar para:</label>
                        <select value={announcementTarget} onChange={e => setAnnouncementTarget(e.target.value)} className="input-style mt-1">
                            <option value="all">Todos</option>
                            <option value="teachers">Professores</option>
                            <option value="funcionarios">Funcionários</option>
                        </select>
                    </div>
                    <button onClick={handleSendAnnouncement} className="btn-primary" disabled={user.role !== 'admin'}><Send size={18} /> Enviar Alerta</button>
                    <p className="text-xs text-gray-500">Nota: O envio de alertas para WhatsApp/Google requer integração de backend e é apenas simulado aqui.</p>
                </div>
            </div>
        </div>
    );
};

const LinkDataSection = ({ data, user, showNotification }) => {
    const [selectedTurmaId, setSelectedTurmaId] = useState('');
    const [selectedTeacherId, setSelectedTeacherId] = useState('');
    const [selectedStudentIds, setSelectedStudentIds] = useState([]);
    const [selectedSubjectIds, setSelectedSubjectIds] = useState([]);

    const selectedTurma = useMemo(() => data.turmas.find(t => t.id === selectedTurmaId), [selectedTurmaId, data.turmas]);

    const handleLink = async (field, value) => {
        if (!selectedTurmaId || !value || value.length === 0) {
            showNotification("Selecione uma turma e os itens para vincular.", "warning");
            return;
        }
        const turmaDocRef = doc(db, `artifacts/${appId}/public/data/turmas`, selectedTurmaId);
        try {
            if (Array.isArray(value)) {
                await updateDoc(turmaDocRef, { [field]: arrayUnion(...value) });
            } else {
                await updateDoc(turmaDocRef, { [field]: value });
            }
            showNotification("Dados vinculados com sucesso!", "success");
            // Reset selections
            if(field === 'studentIds') setSelectedStudentIds([]);
            if(field === 'subjectIds') setSelectedSubjectIds([]);

        } catch (e) {
            showNotification("Erro ao vincular dados.", "error");
            console.error(e);
        }
    };

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-800">Vincular Dados da Turma</h2>
            <div className="bg-white p-6 rounded-lg shadow space-y-4">
                <div>
                    <label htmlFor="turma-select" className="block text-sm font-medium text-gray-700">1. Selecione a Turma</label>
                    <select id="turma-select" value={selectedTurmaId} onChange={e => setSelectedTurmaId(e.target.value)} className="input-style w-full mt-1">
                        <option value="">-- Selecione uma Turma --</option>
                        {data.turmas.map(turma => <option key={turma.id} value={turma.id}>{turma.name} ({turma.area})</option>)}
                    </select>
                </div>
                {selectedTurma && (<div className="p-4 bg-gray-50 rounded-lg border"><h3 className="font-bold">{selectedTurma.name}</h3><p>Professor: {data.teachers.find(t => t.id === selectedTurma.teacherId)?.name || <span className="text-gray-500">Nenhum</span>}</p><p>Alunos: {selectedTurma.studentIds?.length || 0}</p><p>Matérias: {selectedTurma.subjectIds?.length || 0}</p></div>)}
            </div>

            {selectedTurmaId && (
                <div className="grid md:grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="bg-white p-6 rounded-lg shadow space-y-4"><h3 className="text-lg font-semibold text-gray-800">2. Vincular Professor</h3><select value={selectedTeacherId} onChange={e => setSelectedTeacherId(e.target.value)} className="input-style w-full" disabled={user.role !== 'admin'}><option value="">-- Selecione --</option>{data.teachers.map(teacher => <option key={teacher.id} value={teacher.id}>{teacher.name}</option>)}</select><button onClick={() => handleLink('teacherId', selectedTeacherId)} className="btn-primary" disabled={user.role !== 'admin'}>Vincular Professor</button></div>
                    <div className="bg-white p-6 rounded-lg shadow space-y-4"><h3 className="text-lg font-semibold text-gray-800">3. Vincular Alunos</h3><div className="h-48 overflow-y-auto border rounded-lg p-2 space-y-1">{data.students.map(student => (<div key={student.id} className="flex items-center"><input type="checkbox" id={`student-${student.id}`} checked={selectedStudentIds.includes(student.id)} onChange={() => setSelectedStudentIds(p => p.includes(student.id) ? p.filter(i=>i!==student.id) : [...p, student.id])} className="h-4 w-4 rounded" disabled={user.role !== 'admin' || selectedTurma?.studentIds?.includes(student.id)}/><label htmlFor={`student-${student.id}`} className={`ml-2 block text-sm ${selectedTurma?.studentIds?.includes(student.id) ? 'text-gray-400' : 'text-gray-900'}`}>{student.name} {selectedTurma?.studentIds?.includes(student.id) && "(Já na turma)"}</label></div>))}</div><button onClick={() => handleLink('studentIds', selectedStudentIds)} className="btn-primary" disabled={user.role !== 'admin'}>Vincular Alunos</button></div>
                    <div className="bg-white p-6 rounded-lg shadow space-y-4"><h3 className="text-lg font-semibold text-gray-800">4. Vincular Matérias</h3><div className="h-48 overflow-y-auto border rounded-lg p-2 space-y-1">{data.subjects.map(subject => (<div key={subject.id} className="flex items-center"><input type="checkbox" id={`subject-${subject.id}`} checked={selectedSubjectIds.includes(subject.id)} onChange={() => setSelectedSubjectIds(p => p.includes(subject.id) ? p.filter(i=>i!==subject.id) : [...p, subject.id])} className="h-4 w-4 rounded" disabled={user.role !== 'admin' || selectedTurma?.subjectIds?.includes(subject.id)}/><label htmlFor={`subject-${subject.id}`} className={`ml-2 block text-sm ${selectedTurma?.subjectIds?.includes(subject.id) ? 'text-gray-400' : 'text-gray-900'}`}>{subject.name} {selectedTurma?.subjectIds?.includes(subject.id) && "(Já na turma)"}</label></div>))}</div><button onClick={() => handleLink('subjectIds', selectedSubjectIds)} className="btn-primary" disabled={user.role !== 'admin'}>Vincular Matérias</button></div>
                </div>
            )}
        </div>
    );
};

const QueriesSection = ({ data }) => {
    const [queryType, setQueryType] = useState('teachers');
    const [searchTerm, setSearchTerm] = useState('');
    const [areaFilter, setAreaFilter] = useState('');
    const [selectedItem, setSelectedItem] = useState(null);

    const uniqueAreas = useMemo(() => [...new Set(data.turmas.map(t => t.area))], [data.turmas]);

    const filteredData = useMemo(() => {
        const term = searchTerm.toLowerCase();
        let sourceData;
        switch(queryType) {
            case 'teachers': sourceData = data.teachers; break;
            case 'students': sourceData = data.students; break;
            case 'subjects': sourceData = data.subjects; break;
            case 'turmas': sourceData = areaFilter ? data.turmas.filter(t => t.area === areaFilter) : data.turmas; break;
            case 'funcionarios': sourceData = data.funcionarios; break;
            default: sourceData = [];
        }
        if (!term) return sourceData;
        return sourceData.filter(item => item.name && item.name.toLowerCase().includes(term));
    }, [searchTerm, queryType, data, areaFilter]);

    const getFeeStatusClass = (status) => {
        switch(status) {
            case 'paid': return 'text-green-600 bg-green-100';
            case 'due': return 'text-red-600 bg-red-100';
            case 'exempt': return 'text-blue-600 bg-blue-100';
            default: return 'text-gray-600 bg-gray-100';
        }
    };

    return (
        <div className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-800">Consultas</h2>
            <div className="bg-white p-6 rounded-lg shadow space-y-4">
                <div className="flex space-x-2 border-b flex-wrap">
                    <button onClick={() => setQueryType('teachers')} className={`py-2 px-4 ${queryType === 'teachers' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500'}`}>Professores</button>
                    <button onClick={() => setQueryType('students')} className={`py-2 px-4 ${queryType === 'students' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500'}`}>Alunos</button>
                    <button onClick={() => setQueryType('subjects')} className={`py-2 px-4 ${queryType === 'subjects' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500'}`}>Matérias</button>
                    <button onClick={() => setQueryType('turmas')} className={`py-2 px-4 ${queryType === 'turmas' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500'}`}>Turmas</button>
                    <button onClick={() => setQueryType('funcionarios')} className={`py-2 px-4 ${queryType === 'funcionarios' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500'}`}>Funcionários</button>
                </div>
                <div className="flex space-x-4">
                    <div className="relative flex-grow"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} /><input type="text" placeholder={`Pesquisar por nome...`} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="input-style w-full pl-10"/></div>
                    {queryType === 'turmas' && (<select value={areaFilter} onChange={e => setAreaFilter(e.target.value)} className="input-style"><option value="">Todas as Áreas</option>{uniqueAreas.map(area => <option key={area} value={area}>{area}</option>)}</select>)}
                </div>
                <div className="mt-4 overflow-x-auto">
                     <table className="min-w-full bg-white divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            {queryType === 'teachers' && <tr><th className="th-style">Nome</th><th className="th-style">Especialidade</th><th className="th-style">Status</th></tr>}
                            {queryType === 'students' && <tr><th className="th-style">Nome</th><th className="th-style">Turma</th><th className="th-style">Mensalidade</th><th className="th-style">Status</th></tr>}
                            {queryType === 'subjects' && <tr><th className="th-style">Matéria</th><th className="th-style">Carga Horária</th><th className="th-style">Plano de Curso</th></tr>}
                            {queryType === 'turmas' && <tr><th className="th-style">Nome</th><th className="th-style">Área</th><th className="th-style">Professor</th><th className="th-style">Matérias</th></tr>}
                            {queryType === 'funcionarios' && <tr><th className="th-style">Nome</th><th className="th-style">Cargo</th><th className="th-style">Horas Contrato</th></tr>}
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {filteredData.map(item => (
                                <tr key={item.id} onClick={() => setSelectedItem(item)} className="cursor-pointer hover:bg-gray-50">
                                    {queryType === 'teachers' && <><td className="td-style">{item.name}</td><td className="td-style">{item.specialty}</td><td className="td-style">{item.attested ? <span className="text-red-500">Atestado</span> : <span className="text-green-500">Ativo</span>}</td></>}
                                    {queryType === 'students' && <><td className="td-style">{item.name}</td><td className="td-style">{data.turmas.find(t => t.studentIds?.includes(item.id))?.name || 'Não matriculado'}</td><td className="td-style"><span className={`px-2 py-1 rounded-full text-xs font-medium ${getFeeStatusClass(item.monthlyFeeStatus)}`}>{item.monthlyFeeStatus === 'paid' ? 'Em dia' : item.monthlyFeeStatus === 'due' ? 'Atrasado' : 'Isento'}</span></td><td className="td-style">{item.attested ? <span className="text-red-500">Atestado</span> : <span className="text-green-500">Ativo</span>}</td></>}
                                    {queryType === 'subjects' && <><td className="td-style">{item.name}</td><td className="td-style">{item.workload}h</td><td className="td-style"><button className="text-blue-600 hover:underline">Ver Plano</button></td></>}
                                    {queryType === 'turmas' && <><td className="td-style">{item.name}</td><td className="td-style">{item.area}</td><td className="td-style">{data.teachers.find(t => t.id === item.teacherId)?.name || 'Não definido'}</td><td className="td-style text-xs">{item.subjectIds?.map(id => data.subjects.find(s => s.id === id)?.name).join(', ') || 'Nenhuma'}</td></>}
                                    {queryType === 'funcionarios' && <><td className="td-style">{item.name}</td><td className="td-style">{item.role}</td><td className="td-style">{item.contractHours}h</td></>}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            <Modal isOpen={!!selectedItem} onClose={() => setSelectedItem(null)} title={`Detalhes de ${selectedItem?.name}`}>
                {selectedItem && (<div className="space-y-4">{Object.entries(selectedItem).map(([key, value]) => {if (typeof value === 'object' || key === 'id' || key === 'createdAt') return null; return (<div key={key} className="flex border-b pb-2"><p className="font-semibold text-gray-600 w-1/3">{key.charAt(0).toUpperCase() + key.slice(1)}:</p><p className="text-gray-800 w-2/3">{value.toString()}</p></div>)})}</div>)}
            </Modal>
        </div>
    );
};

const ReportsSection = ({ data }) => {
    const teacherWorkload = data.teachers.map(t => ({ name: t.name, ocupado: Object.keys(t.schedule || {}).length, livre: (t.contractHours || 40) - Object.keys(t.schedule || {}).length, }));
    const feeStatusData = [
        { name: 'Em Dia', value: data.students.filter(s => s.monthlyFeeStatus === 'paid').length },
        { name: 'Atrasado', value: data.students.filter(s => s.monthlyFeeStatus === 'due').length },
        { name: 'Isento', value: data.students.filter(s => s.monthlyFeeStatus === 'exempt').length },
    ];
    const COLORS = ['#0088FE', '#FF8042', '#00C49F'];

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-800">Relatórios</h2>
            <div className="grid lg:grid-cols-2 gap-6">
                 <div className="bg-white p-6 rounded-lg shadow">
                    <h3 className="text-lg font-semibold text-gray-700">Situação Financeira dos Alunos</h3>
                    <div style={{ width: '100%', height: 300 }}>
                        <ResponsiveContainer><PieChart><Pie data={feeStatusData} cx="50%" cy="50%" labelLine={false} outerRadius={100} fill="#8884d8" dataKey="value" nameKey="name" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} >{feeStatusData.map((entry, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />))}</Pie><Tooltip/></PieChart></ResponsiveContainer>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-lg shadow">
                    <h3 className="text-lg font-semibold text-gray-700">Carga Horária dos Professores</h3>
                    <div style={{ width: '100%', height: 300 }}>
                        <ResponsiveContainer><BarChart data={teacherWorkload} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis /><Tooltip /><Legend /><Bar dataKey="ocupado" stackId="a" fill="#3b82f6" name="Horas Ocupadas" /><Bar dataKey="livre" stackId="a" fill="#a5b4fc" name="Horas Livres" /></BarChart></ResponsiveContainer>
                    </div>
                </div>
            </div>
             <button onClick={() => window.print()} className="btn-secondary mt-4"><FileText size={18} /> Imprimir Página de Relatórios</button>
        </div>
    );
};

// --- COMPONENTES DE LOGIN E APP PRINCIPAL ---
const LoginScreen = ({ onLogin, showNotification }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const handleLogin = () => {
        if (email === 'admin@escola.com' && password === 'admin') { onLogin({ email, role: 'admin' }); showNotification('Login como administrador bem-sucedido!', 'success'); } 
        else if (email === 'viewer@escola.com' && password === 'viewer') { onLogin({ email, role: 'viewer' }); showNotification('Login como visualizador bem-sucedido!', 'success'); } 
        else { showNotification('Credenciais inválidas.', 'error'); }
    };
    return (
        <div className="bg-gray-100 min-h-screen flex items-center justify-center font-sans">
            <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-xl shadow-lg">
                <div className="text-center"><Users className="mx-auto h-12 w-auto text-blue-600" /><h1 className="text-3xl font-bold text-gray-900 mt-4">Credenciamento Escolar</h1><p className="mt-2 text-sm text-gray-600">Faça login para continuar</p></div>
                <div className="space-y-4">
                    <div className="relative"><Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} /><input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="E-mail" className="input-style w-full pl-10"/></div>
                    <div className="relative"><Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} /><input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Senha" className="input-style w-full pl-10"/></div>
                </div>
                <button onClick={handleLogin} className="w-full flex items-center justify-center px-4 py-3 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-blue-600 hover:bg-blue-700"><LogIn className="mr-2" /> Entrar</button>
                <div className="text-xs text-center text-gray-500 mt-4"><p>Use <span className="font-mono">admin@escola.com</span> / <span className="font-mono">admin</span> para acesso de administrador.</p><p>Use <span className="font-mono">viewer@escola.com</span> / <span className="font-mono">viewer</span> para acesso de visualizador.</p></div>
            </div>
        </div>
    );
};

export default function App() {
    const [user, setUser] = useState(null);
    const [activePage, setActivePage] = useState('dashboard');
    const [isAuthReady, setIsAuthReady] = useState(false);
    const [data, setData] = useState({ teachers: [], students: [], subjects: [], turmas: [], funcionarios: [], events: [], announcements: [] });
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [notification, setNotification] = useState({ message: '', type: '' });

    const showNotification = (message, type) => {
        setNotification({ message, type });
        setTimeout(() => setNotification({ message: '', type: '' }), 4000);
    };

    useEffect(() => {
        if (!db || !auth) { console.error("Firebase não inicializado."); return; }
        const authHandler = async () => {
            try {
                if (initialAuthToken) await signInWithCustomToken(auth, initialAuthToken);
                else await signInAnonymously(auth);
            } catch (error) { console.error("Erro na autenticação:", error); }
        };
        const setupInitialData = async () => {
            const collections = { teachers: sampleTeachers, students: sampleStudents, subjects: sampleSubjects, turmas: sampleTurmas, funcionarios: sampleFuncionarios, events: sampleEvents, announcements: sampleAnnouncements };
            for (const [colName, sampleData] of Object.entries(collections)) {
                const collectionPath = `artifacts/${appId}/public/data/${colName}`;
                const q = query(collection(db, collectionPath));
                const snap = await getDocs(q);
                if (snap.empty) {
                    console.log(`Populando dados de amostra para ${colName}...`);
                    for (const item of sampleData) { await addDoc(collection(db, collectionPath), item); }
                }
            }
        };
        onAuthStateChanged(auth, (user) => {
            if (user) { if (!isAuthReady) { setupInitialData(); setIsAuthReady(true); } } 
            else { authHandler(); }
        });
    }, []);

    useEffect(() => {
        if (!isAuthReady || !db) return;
        const collectionsToListen = ['teachers', 'students', 'subjects', 'turmas', 'funcionarios', 'events', 'announcements'];
        const unsubs = collectionsToListen.map(colName => {
            return onSnapshot(collection(db, `artifacts/${appId}/public/data/${colName}`), snapshot => {
                const collectionData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setData(prevData => ({ ...prevData, [colName]: collectionData }));
            }, error => {
                console.error(`Erro no listener de ${colName}:`, error);
                showNotification(`Erro ao carregar ${colName}.`, "error");
            });
        });
        return () => unsubs.forEach(unsub => unsub());
    }, [isAuthReady]);

    if (!user) {
        return <LoginScreen onLogin={setUser} showNotification={showNotification} />;
    }
    
    const menuItems = [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'addData', label: 'Adicionar Dados', icon: PlusCircle },
        { id: 'linkData', label: 'Vincular Dados', icon: Link2 },
        { id: 'events', label: 'Eventos e Avisos', icon: CalendarPlus },
        { id: 'queries', label: 'Consultas', icon: Search },
        { id: 'reports', label: 'Relatórios', icon: FileText },
    ];
    
    const SidebarMenuItem = ({ item, isActive, onClick }) => (
         <button onClick={onClick} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors duration-200 ${isActive ? 'bg-blue-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-200'}`}>
            <item.icon size={20} />
            {isSidebarOpen && <span className="font-medium">{item.label}</span>}
        </button>
    );

    return (
        <div className="bg-gray-50 min-h-screen flex font-sans">
            <Notification message={notification.message} type={notification.type} onDismiss={() => setNotification({ message: '', type: '' })} />
            <aside className={`bg-gray-100 border-r border-gray-200 transition-all duration-300 ${isSidebarOpen ? 'w-64' : 'w-20'}`}>
                <div className="p-4 flex flex-col h-full">
                    <div className="flex items-center justify-between mb-6">
                         {isSidebarOpen && <div className="flex items-center space-x-2"><Users className="text-blue-600" size={32} /><h1 className="text-xl font-bold text-gray-800">Gestão</h1></div>}
                        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-1 rounded-md hover:bg-gray-200">{isSidebarOpen ? <XCircle size={20} /> : <Users size={24} className="text-blue-600"/>}</button>
                    </div>
                    <nav className="space-y-2 flex-grow">{menuItems.map(item => <SidebarMenuItem key={item.id} item={item} isActive={activePage === item.id} onClick={() => setActivePage(item.id)}/>)}</nav>
                    <div className="border-t border-gray-200 pt-4">
                        {isSidebarOpen && <>
                        <div className="p-3 bg-white rounded-lg shadow-sm">
                            <p className="font-semibold text-gray-800 text-center">{user.role === 'admin' ? 'Administrador' : 'Visualizador'}</p>
                            <p className="text-xs text-gray-500 text-center">{user.email}</p>
                        </div>
                         <button onClick={() => setUser(null)} className="w-full mt-4 flex items-center justify-center space-x-2 text-sm text-red-500 hover:text-red-700"><LogIn size={16} /><span>Sair</span></button>
                        </>}
                    </div>
                </div>
            </aside>
            <main className="flex-1 p-8 overflow-y-auto" style={{ paddingBottom: '120px' }}>
                {activePage === 'dashboard' && <DashboardSection data={data} user={user} showNotification={showNotification} />}
                {activePage === 'addData' && <AddDataSection userType={user.role} showNotification={showNotification} />}
                {activePage === 'linkData' && <LinkDataSection data={data} user={user} showNotification={showNotification} />}
                {activePage === 'events' && <EventsAndAnnouncementsSection data={data} user={user} showNotification={showNotification} />}
                {activePage === 'queries' && <QueriesSection data={data} />}
                {activePage === 'reports' && <ReportsSection data={data} />}
            </main>
            <style>{`.input-style{width:100%;padding:.75rem;border:1px solid #d1d5db;border-radius:.5rem;transition:border-color .2s,box-shadow .2s}.input-style:focus{outline:0;border-color:#2563eb;box-shadow:0 0 0 2px rgba(59,130,246,.4)}.btn-primary{display:inline-flex;align-items:center;gap:.5rem;background-color:#2563eb;color:#fff;font-weight:500;padding:.75rem 1.5rem;border-radius:.5rem;transition:background-color .2s}.btn-primary:hover{background-color:#1d4ed8}.btn-secondary{display:inline-flex;align-items:center;gap:.5rem;background-color:#e5e7eb;color:#374151;font-weight:500;padding:.75rem 1.5rem;border-radius:.5rem;transition:background-color .2s}.btn-secondary:hover{background-color:#d1d5db}.th-style{padding:.75rem 1.5rem;text-align:left;font-size:.75rem;font-weight:600;color:#4b5563;text-transform:uppercase;letter-spacing:.05em}.td-style{padding:1rem 1.5rem;white-space:nowrap;font-size:.875rem;color:#1f2937}`}</style>
        </div>
    );
}
