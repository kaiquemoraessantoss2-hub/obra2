'use client';

import { Camera, Key } from 'lucide-react';
import SettingOption from '@/components/ui/setting-option';
import { useAppContext } from '@/context/AppContext';

export default function SettingsTab() {
  const {
    currentUser, setCurrentUser,
    isEditingProfile, setIsEditingProfile,
    isChangingPassword, setIsChangingPassword,
    newPassword, setNewPassword,
    confirmPassword, setConfirmPassword,
    savingPassword,
    profileInputRef,
    handleProfilePhotoChange, handleSaveAccount, handleChangePassword,
  } = useAppContext();

  const roleLabel = () => {
    const role = currentUser?.role as string;
    if (role === 'SUPERADMIN') return 'Administrador';
    if (role === 'ADMIN') return 'Gestor';
    if (role === 'ENGINEER') return 'Engenheiro';
    return 'Visualizador';
  };

  return (
    <div className="glass-card p-10 rounded-[40px] max-w-2xl">
      <h2 className="text-2xl font-black text-white mb-8">Ajustes da Conta</h2>

      <div className="flex items-center gap-6 mb-10">
        <div className="relative">
          {currentUser?.avatar ? (
            <img src={currentUser.avatar} alt="Foto de perfil" className="w-24 h-24 rounded-full object-cover border-4 border-blue-500" />
          ) : (
            <div className="w-24 h-24 rounded-full bg-slate-700 flex items-center justify-center border-4 border-slate-600">
              <span className="text-3xl font-black text-white">{currentUser?.name?.charAt(0) || '?'}</span>
            </div>
          )}
          <button
            onClick={() => profileInputRef.current?.click()}
            className="absolute bottom-0 right-0 bg-blue-600 p-2 rounded-full hover:bg-blue-500 transition-all"
          >
            <Camera className="w-4 h-4 text-white" />
          </button>
          <input
            ref={profileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleProfilePhotoChange}
          />
        </div>
        <div>
          <h3 className="text-xl font-black text-white">{currentUser?.name}</h3>
          <p className="text-slate-500 text-sm">{roleLabel()}</p>
        </div>
      </div>

      <div className="space-y-4 mb-8">
        <div className="bg-slate-800/50 p-4 rounded-2xl">
          <label className="text-slate-400 text-xs font-bold uppercase tracking-wider block mb-2">E-mail</label>
          <div className="flex items-center gap-3">
            <input
              type="email"
              defaultValue={currentUser?.email}
              className="bg-transparent text-white font-medium flex-1 outline-none"
              readOnly={!isEditingProfile}
              id="settings-email"
            />
            <button onClick={() => setIsEditingProfile(!isEditingProfile)} className="text-blue-400 text-sm hover:text-blue-300">
              {isEditingProfile ? 'Cancelar' : 'Editar'}
            </button>
          </div>
        </div>

        <div className="bg-slate-800/50 p-4 rounded-2xl">
          <label className="text-slate-400 text-xs font-bold uppercase tracking-wider block mb-2">Senha</label>
          {!isChangingPassword ? (
            <div key="pwd-display" className="flex items-center gap-3">
              <span className="text-white font-medium tracking-widest flex-1">••••••••</span>
              <button onClick={() => setIsChangingPassword(true)} className="text-blue-400 text-sm hover:text-blue-300 flex items-center gap-1">
                <Key className="w-3 h-3" /> Alterar
              </button>
            </div>
          ) : (
            <div key="pwd-form" className="space-y-3">
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Nova senha (mín. 6 caracteres)"
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white outline-none focus:border-blue-500"
                autoFocus
              />
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirmar nova senha"
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white outline-none focus:border-blue-500"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => { setIsChangingPassword(false); setNewPassword(''); setConfirmPassword(''); }}
                  disabled={savingPassword}
                  className="flex-1 py-2 text-slate-400 hover:text-white text-sm font-bold"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleChangePassword}
                  disabled={savingPassword}
                  className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-xl text-white text-sm font-bold"
                >
                  {savingPassword ? 'Salvando...' : 'Salvar nova senha'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {isEditingProfile && (
        <button
          onClick={() => {
            const email = (document.getElementById('settings-email') as HTMLInputElement)?.value;
            handleSaveAccount({ email, password: '' });
          }}
          className="w-full py-3 bg-blue-600 hover:bg-blue-500 rounded-2xl font-bold text-white transition-all"
        >
          Salvar Alterações
        </button>
      )}

      <div className="mt-10 pt-8 border-t border-white/10">
        <h4 className="font-bold text-white mb-4">Preferências</h4>
        <div className="space-y-6">
          <SettingOption title="Notificações via WhatsApp" desc="Receber alertas sobre atrasos de fornecedores." checked />
          <SettingOption title="Monitoramento 3D Privado" desc="Restringir visualização do prédio a engenheiros." checked={false} />
        </div>
      </div>
    </div>
  );
}
