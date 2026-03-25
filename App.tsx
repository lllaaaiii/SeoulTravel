
import React, { useState, useEffect } from 'react';
import { Tab, Member, EventCategory } from './types';
import { MEMBERS } from './constants';
import { ScheduleView } from './components/ScheduleView';
import { ExpenseView } from './components/ExpenseView';
import { PlanningView } from './components/PlanningView';
import { JournalView } from './components/JournalView';
import { Calendar, CircleDollarSign, BookOpen, ShoppingBag, Settings, Download, FileSpreadsheet } from 'lucide-react';
import { db } from './services/firebase';
import { collection, onSnapshot, doc, updateDoc, setDoc, getDocs, addDoc, query, orderBy } from 'firebase/firestore';
import * as XLSX from 'xlsx';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>(Tab.SCHEDULE);
  const [members, setMembers] = useState<Member[]>([]);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  const coverImage = "https://i.postimg.cc/c1zyQDmq/we.png";

  useEffect(() => {
    const unsubscribeMembers = onSnapshot(collection(db, 'members'), (snapshot) => {
      const fetchedMembers: Member[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Member));
      fetchedMembers.sort((a, b) => a.id.localeCompare(b.id));
      if (fetchedMembers.length > 0) setMembers(fetchedMembers);
      else seedMembers();
    });

    checkAndSeedEvents();

    return () => {
      unsubscribeMembers();
    };
  }, []);

  const seedMembers = async () => {
    for (const member of MEMBERS) {
      await setDoc(doc(db, 'members', member.id), member);
    }
  };

  const checkAndSeedEvents = async () => {
    const snapshot = await getDocs(collection(db, 'events'));
    if (snapshot.empty) {
      const initialEvents = [
        // Day 1
        { id: 'day1-1', date: '2026-01-30', location: '去程 (虎航IT602), 23:30到', category: EventCategory.TRANSPORT, notes: '' },
        { id: 'day1-2', date: '2026-01-30', location: 'Momoho Hongdae', category: EventCategory.STAY, notes: '' },
        // Day 2
        { id: 'day2-1', date: '2026-01-31', location: '弘大', category: EventCategory.SIGHTSEEING, notes: '' },
        { id: 'day2-2', date: '2026-01-31', location: 'Momoho Hongdae', category: EventCategory.STAY, notes: '' },
        // Day 3
        { id: 'day3-1', date: '2026-02-01', location: '一日遊', category: EventCategory.SIGHTSEEING, notes: '' },
        { id: 'day3-2', date: '2026-02-01', location: 'Momoho Hongdae', category: EventCategory.STAY, notes: '' },
        // Day 4
        { id: 'day4-1', date: '2026-02-02', location: '纛島玩雪橇 (10:00~17:00)', category: EventCategory.SIGHTSEEING, notes: '' },
        { id: 'day4-2', date: '2026-02-02', location: 'beton', category: EventCategory.FOOD, notes: '' },
        { id: 'day4-3', date: '2026-02-02', location: 'ODE', category: EventCategory.SIGHTSEEING, notes: '' },
        { id: 'day4-4', date: '2026-02-02', location: '聖水', category: EventCategory.SIGHTSEEING, notes: '' },
        { id: 'day4-5', date: '2026-02-02', location: '(經紀公司)', category: EventCategory.SIGHTSEEING, notes: '' },
        { id: 'day4-6', date: '2026-02-02', location: '(星空圖書館)', category: EventCategory.SIGHTSEEING, notes: '' },
        { id: 'day4-7', date: '2026-02-02', location: 'Puradak炸雞', category: EventCategory.FOOD, notes: '' },
        { id: 'day4-8', date: '2026-02-02', location: 'Momoho Hongdae', category: EventCategory.STAY, notes: '' },
        // Day 5
        { id: 'day5-1', date: '2026-02-03', location: '廣藏市場', category: EventCategory.SIGHTSEEING, notes: '' },
        { id: 'day5-2', date: '2026-02-03', location: '明洞', category: EventCategory.SIGHTSEEING, notes: '' },
        { id: 'day5-3', date: '2026-02-03', location: 'Momoho Hongdae', category: EventCategory.STAY, notes: '' },
        // Day 6
        { id: 'day6-1', date: '2026-02-04', location: '醫美', category: EventCategory.SIGHTSEEING, notes: '' },
        { id: 'day6-2', date: '2026-02-04', location: '東大門', category: EventCategory.SIGHTSEEING, notes: '' },
        { id: 'day6-3', date: '2026-02-04', location: '(溜冰)', category: EventCategory.SIGHTSEEING, notes: '' },
        { id: 'day6-4', date: '2026-02-04', location: 'Momoho Hongdae', category: EventCategory.STAY, notes: '' },
        // Day 7
        { id: 'day7-1', date: '2026-02-05', location: '回程 (大韓KE2027), 16:20飛機', category: EventCategory.TRANSPORT, notes: '' },
        { id: 'day7-2', date: '2026-02-05', location: 'Momoho Hongdae', category: EventCategory.STAY, notes: '' },
      ];

      for (const event of initialEvents) {
        const { id, ...eventData } = event;
        await setDoc(doc(db, 'events', id), {
          ...eventData,
          time: '',
          title: '',
          createdAt: new Date().toISOString()
        });
      }
    }
  };

  const handleUpdateMemberName = async (id: string, newName: string) => {
    await updateDoc(doc(db, 'members', id), { name: newName });
  };

  const handleMemberAvatarChange = async (memberId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result as string;
      await updateDoc(doc(db, 'members', memberId), { avatar: base64String });
    };
    reader.readAsDataURL(file);
  };

  const handleExportData = async () => {
    try {
      const collections = ['members', 'events', 'expenses', 'pretrip_tasks', 'todos', 'journal', 'config'];
      const exportData: Record<string, any> = {};

      for (const colName of collections) {
        const snapshot = await getDocs(collection(db, colName));
        exportData[colName] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      }

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `seoul_go_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export failed:", err);
      alert("資料匯出失敗，請稍後再試。");
    }
  };

  const handleExportExcel = async () => {
    try {
      const wb = XLSX.utils.book_new();
      const memberMap: Record<string, string> = {};
      members.forEach(m => { memberMap[m.id] = m.name; });

      // 1. 行程表
      const eventsSnap = await getDocs(query(collection(db, 'events'), orderBy('date'), orderBy('time')));
      const eventsData = eventsSnap.docs.map(doc => {
        const d = doc.data();
        return {
          '日期': d.date || '',
          '時間': d.time || '',
          '分類': d.category || '',
          '標題': d.title || '',
          '地點': d.location || '',
          '備註': d.notes || ''
        };
      });
      const wsEvents = XLSX.utils.json_to_sheet(eventsData);
      XLSX.utils.book_append_sheet(wb, wsEvents, "行程表");

      // 2. 記帳本
      const expensesSnap = await getDocs(query(collection(db, 'expenses'), orderBy('date', 'desc'), orderBy('time', 'desc')));
      const expensesData = expensesSnap.docs.map(doc => {
        const d = doc.data();
        const splitNames = (d.splitWithIds || []).map((id: string) => memberMap[id] || id).join(', ');
        return {
          '日期': d.date || '',
          '時間': d.time || '',
          '項目': d.description || '',
          '分類': d.category || '',
          '韓幣(KRW)': d.amountKRW || 0,
          '台幣(TWD)': d.amountTWD || 0,
          '付款人': memberMap[d.payerId] || d.payerId || '',
          '分攤成員': splitNames
        };
      });
      const wsExpenses = XLSX.utils.json_to_sheet(expensesData);
      XLSX.utils.book_append_sheet(wb, wsExpenses, "記帳本");

      // 3. 行前準備
      const pretripSnap = await getDocs(collection(db, 'pretrip_tasks'));
      const pretripData = pretripSnap.docs.map(doc => {
        const d = doc.data();
        const finishedBy = (d.completedBy || []).map((id: string) => memberMap[id] || id).join(', ');
        return {
          '項目': d.title || '',
          '已完成成員': finishedBy
        };
      });
      const wsPretrip = XLSX.utils.json_to_sheet(pretripData);
      XLSX.utils.book_append_sheet(wb, wsPretrip, "行前準備");

      // 4. 個人清單
      const todosSnap = await getDocs(query(collection(db, 'todos'), orderBy('ownerId')));
      const todosData = todosSnap.docs.map(doc => {
        const d = doc.data();
        const typeMap: Record<string, string> = { 'todo': '準備', 'packing': '打包', 'shopping': '購物' };
        return {
          '成員': memberMap[d.ownerId] || d.ownerId || '',
          '類型': typeMap[d.type] || d.type || '',
          '內容': d.text || '',
          '狀態': d.completed ? '已完成' : '未完成'
        };
      });
      const wsTodos = XLSX.utils.json_to_sheet(todosData);
      XLSX.utils.book_append_sheet(wb, wsTodos, "個人清單");

      // 5. 旅遊日誌
      const journalSnap = await getDocs(query(collection(db, 'journal'), orderBy('date', 'desc')));
      const journalData = journalSnap.docs.map(doc => {
        const d = doc.data();
        return {
          '日期': d.date ? new Date(d.date).toLocaleString() : '',
          '作者': memberMap[d.authorId] || d.authorId || '',
          '內容': d.content || ''
        };
      });
      const wsJournal = XLSX.utils.json_to_sheet(journalData);
      XLSX.utils.book_append_sheet(wb, wsJournal, "旅遊日誌");

      XLSX.writeFile(wb, `seoul_go_report_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (err) {
      console.error("Excel export failed:", err);
      alert("Excel 匯出失敗，請稍後再試。");
    }
  };

  const renderContent = () => {
    return (
      <div className="page-transition h-full overflow-y-auto no-scrollbar">
        {(() => {
          switch (activeTab) {
            case Tab.SCHEDULE: return <ScheduleView members={members} />;
            case Tab.EXPENSE: return <ExpenseView members={members} />;
            case Tab.PLANNING: return <PlanningView members={members} />;
            case Tab.JOURNAL: return <JournalView members={members} />;
            default: return <ScheduleView members={members} />;
          }
        })()}
      </div>
    );
  };

  return (
    <div className="h-screen w-full max-w-md mx-auto bg-[#FCFBF7] flex flex-col relative overflow-hidden font-sans">
      <header className="px-6 pt-10 pb-4 bg-transparent z-20 flex items-center justify-between gap-2">
        <div className="flex flex-col flex-1 min-w-0">
           <h1 className="text-2xl font-black text-sky-400 tracking-tighter leading-none mb-2 uppercase truncate drop-shadow-sm">Seoul Go!</h1>
           <div className="flex flex-col items-start gap-1.5">
              <div className="bg-sky-400 text-brand-100 border border-sky-500/20 text-[10px] font-black px-2.5 py-0.5 rounded-full shadow-sm whitespace-nowrap uppercase tracking-widest">
                時光膠囊
              </div>
              <p className="text-[9px] text-slate-400 font-black tracking-widest whitespace-nowrap leading-none pl-0.5">2026.01.30 - 02.05</p>
           </div>
        </div>
        <div className="w-36 h-20 shrink-0 relative flex items-center justify-center overflow-visible -my-2">
          <img src={coverImage} alt="Cover" className="h-full w-auto object-contain mix-blend-multiply filter drop-shadow-[0_6px_10px_rgba(0,0,0,0.12)] transition-transform duration-500 hover:scale-110 active:scale-95" />
        </div>
        <button onClick={() => setIsSettingsOpen(true)} className="w-10 h-10 rounded-xl bg-white/50 backdrop-blur-sm shadow-soft flex items-center justify-center border border-white active:scale-95 transition-all shrink-0">
           <Settings size={20} className="text-slate-300" />
        </button>
      </header>
      <main className="flex-1 overflow-hidden relative">
        {renderContent()}
      </main>
      <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto px-6 pb-[env(safe-area-inset-bottom,16px)] pt-2 z-[60]">
        <nav className="bg-white/90 backdrop-blur-md rounded-[24px] shadow-nav p-0.5 flex justify-between items-center border border-slate-100/50">
          <NavButton active={activeTab === Tab.SCHEDULE} onClick={() => setActiveTab(Tab.SCHEDULE)} icon={Calendar} label="行程" />
          <NavButton active={activeTab === Tab.EXPENSE} onClick={() => setActiveTab(Tab.EXPENSE)} icon={CircleDollarSign} label="記帳" />
          <NavButton active={activeTab === Tab.PLANNING} onClick={() => setActiveTab(Tab.PLANNING)} icon={ShoppingBag} label="購物" />
          <NavButton active={activeTab === Tab.JOURNAL} onClick={() => setActiveTab(Tab.JOURNAL)} icon={BookOpen} label="日誌" />
        </nav>
      </div>

      {isSettingsOpen && (
        <SettingsModal 
          members={members} 
          onClose={() => setIsSettingsOpen(false)} 
          onUpdateAvatar={handleMemberAvatarChange}
          onUpdateName={handleUpdateMemberName}
          onExportData={handleExportData}
          onExportExcel={handleExportExcel}
        />
      )}
    </div>
  );
};

interface SettingsModalProps {
  members: Member[];
  onClose: () => void;
  onUpdateAvatar: (id: string, e: React.ChangeEvent<HTMLInputElement>) => void;
  onUpdateName: (id: string, name: string) => void;
  onExportData: () => Promise<void>;
  onExportExcel: () => Promise<void>;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ members, onClose, onUpdateAvatar, onUpdateName, onExportData, onExportExcel }) => {
  const [localNames, setLocalNames] = useState<Record<string, string>>({});
  const [isExporting, setIsExporting] = useState(false);
  const [isExportingExcel, setIsExportingExcel] = useState(false);

  useEffect(() => {
    const names: Record<string, string> = {};
    members.forEach(m => { names[m.id] = m.name; });
    setLocalNames(names);
  }, [members]);

  const handleNameChange = (id: string, name: string) => {
    setLocalNames(prev => ({ ...prev, [id]: name }));
    onUpdateName(id, name);
  };

  const handleExport = async () => {
    setIsExporting(true);
    await onExportData();
    setIsExporting(false);
  };

  const handleExcelExport = async () => {
    setIsExportingExcel(true);
    await onExportExcel();
    setIsExportingExcel(false);
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-end justify-center">
      <div className="bg-white rounded-t-[32px] p-6 w-full max-w-md shadow-2xl animate-in slide-in-from-bottom-10">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-slate-800">旅伴設定</h2>
          <button onClick={onClose} className="text-slate-300 p-1 text-xl">✕</button>
        </div>
        <div className="space-y-4 mb-6 max-h-[50vh] overflow-y-auto no-scrollbar">
          {members.map(member => (
            <div key={member.id} className="flex items-center gap-3 bg-slate-50 p-2 pr-4 rounded-2xl border border-slate-100">
              <label className="relative cursor-pointer group shrink-0">
                <div className="w-12 h-12 rounded-full border-2 border-white shadow-sm overflow-hidden bg-white flex items-center justify-center">
                  <img src={member.avatar} alt="avatar" className="w-full h-full object-cover" />
                </div>
                <input type="file" accept="image/*" className="hidden" onChange={(e) => onUpdateAvatar(member.id, e)} />
              </label>
              <div className="flex-1">
                <label className="text-[8px] font-bold text-slate-300 uppercase tracking-widest block ml-1 mb-0.5">旅伴姓名</label>
                <input 
                  type="text" 
                  value={localNames[member.id] ?? member.name} 
                  onChange={(e) => handleNameChange(member.id, e.target.value)} 
                  className="w-full bg-white px-3 py-1.5 rounded-xl text-sm font-bold text-slate-700 outline-none border border-slate-100 focus:border-sky-200 transition-colors" 
                />
              </div>
            </div>
          ))}
        </div>
        
        <div className="space-y-3 mb-8">
          <h3 className="text-[10px] font-black text-slate-300 uppercase tracking-widest ml-1">資料管理</h3>
          <div className="grid grid-cols-2 gap-3">
            <button 
              onClick={handleExport}
              disabled={isExporting}
              className="py-3 bg-slate-50 text-slate-600 text-xs font-bold rounded-2xl border border-slate-100 flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50"
            >
              <Download size={14} />
              {isExporting ? '匯出中...' : 'JSON 備份'}
            </button>
            <button 
              onClick={handleExcelExport}
              disabled={isExportingExcel}
              className="py-3 bg-emerald-50 text-emerald-600 text-xs font-bold rounded-2xl border border-emerald-100 flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50"
            >
              <FileSpreadsheet size={14} />
              {isExportingExcel ? '匯出中...' : 'Excel 報表'}
            </button>
          </div>
        </div>

        <button onClick={onClose} className="w-full py-4 bg-sky-400 text-white text-lg font-bold rounded-2xl shadow-active active:scale-95 transition-all">完成設定</button>
      </div>
    </div>
  );
};

interface NavButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.FC<{ size?: number; className?: string; strokeWidth?: number }>;
  label: string;
}

const NavButton: React.FC<NavButtonProps> = ({ active, onClick, icon: Icon, label }) => (
  <button onClick={onClick} className="flex flex-col items-center justify-center flex-1 py-1 group">
    <div className={`transition-all duration-300 flex items-center justify-center w-8 h-8 ${active ? 'text-sky-400 scale-110' : 'text-slate-300 group-active:scale-90'}`}>
      <Icon size={20} strokeWidth={active ? 2.5 : 2} />
    </div>
    <span className={`text-[10px] font-bold transition-colors duration-200 mt-0.5 ${active ? 'text-sky-400' : 'text-slate-400'}`}>{label}</span>
  </button>
);

export default App;
