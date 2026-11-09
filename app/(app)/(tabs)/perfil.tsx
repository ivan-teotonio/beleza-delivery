import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../../../src/components/Screen';
import { AppText } from '../../../src/components/AppText';
import { Avatar } from '../../../src/components/Avatar';
import { Badge, STATUS_VERIFICACAO_LABEL, STATUS_VERIFICACAO_TONE } from '../../../src/components/Badge';
import { Card } from '../../../src/components/Card';
import { Button } from '../../../src/components/Button';
import { Dialog } from '../../../src/components/Dialog';
import { Notice } from '../../../src/components/Notice';
import { SectionHeader } from '../../../src/components/SectionHeader';
import { useSession } from '../../../src/providers/SessionProvider';
import { useToast } from '../../../src/providers/ToastProvider';
import { colors, minTouchTarget, radius, spacing } from '../../../src/theme';

interface ItemMenu {
  icon: keyof typeof Ionicons.glyphMap;
  titulo: string;
  descricao: string;
  rota: string;
}

const ITENS_CLIENTE: ItemMenu[] = [
  {
    icon: 'location-outline',
    titulo: 'Meu endereço',
    descricao: 'Endereço único usado nos agendamentos',
    rota: '/endereco',
  },
  {
    icon: 'calendar-outline',
    titulo: 'Meus agendamentos',
    descricao: 'Histórico, status e valores',
    rota: '/agendamentos',
  },
  {
    icon: 'create-outline',
    titulo: 'Editar perfil',
    descricao: 'Nome e telefone de contato',
    rota: '/editar-perfil',
  },
];

const ITENS_PROFISSIONAL: ItemMenu[] = [
  {
    icon: 'navigate-outline',
    titulo: 'Meu atendimento a domicílio',
    descricao: 'Distância máxima, faixas e prévia de valores',
    rota: '/atendimento-domicilio',
  },
  {
    icon: 'images-outline',
    titulo: 'Portfólio',
    descricao: 'Fotos exibidas no seu perfil público',
    rota: '/portfolio',
  },
  {
    icon: 'cut-outline',
    titulo: 'Meus serviços',
    descricao: 'Preços, duração e disponibilidade',
    rota: '/servicos',
  },
  {
    icon: 'time-outline',
    titulo: 'Minha agenda',
    descricao: 'Blocos de horário disponíveis',
    rota: '/agenda',
  },
  {
    icon: 'bar-chart-outline',
    titulo: 'Relatório',
    descricao: 'Atendimentos, receitas e avaliações',
    rota: '/relatorio',
  },
  {
    icon: 'create-outline',
    titulo: 'Editar perfil profissional',
    descricao: 'Dados, descrição, prazo e localização',
    rota: '/editar-perfil',
  },
];

const ITENS_ADMIN: ItemMenu[] = [
  {
    icon: 'shield-checkmark-outline',
    titulo: 'Aprovações',
    descricao: 'Analisar cadastros de profissionais',
    rota: '/aprovacoes',
  },
  {
    icon: 'document-text-outline',
    titulo: 'Auditoria',
    descricao: 'Registro das ações críticas',
    rota: '/auditoria',
  },
  {
    icon: 'create-outline',
    titulo: 'Editar perfil',
    descricao: 'Dados de contato',
    rota: '/editar-perfil',
  },
];

export default function Perfil() {
  const { perfil, tipo, encerrarSessao } = useSession();
  const { showToast } = useToast();
  const [sairAberto, setSairAberto] = useState(false);
  const [saindo, setSaindo] = useState(false);

  const nome =
    perfil?.profissional?.nome ?? perfil?.cliente?.nome ?? perfil?.usuario?.email?.split('@')[0] ?? 'Usuário';
  const email = perfil?.usuario?.email ?? '';
  const foto = perfil?.profissional?.foto_url ?? null;
  const itens =
    tipo === 'profissional' ? ITENS_PROFISSIONAL : tipo === 'admin' ? ITENS_ADMIN : ITENS_CLIENTE;
  const status = perfil?.profissional?.status_verificacao;

  async function sair() {
    setSaindo(true);
    try {
      await encerrarSessao();
      showToast('Você saiu da sua conta.');
      router.replace('/entrar');
    } finally {
      setSaindo(false);
      setSairAberto(false);
    }
  }

  return (
    <Screen>
      <Card style={styles.cabecalho}>
        <Avatar nome={nome} uri={foto} size={80} />
        <View style={styles.dados}>
          <AppText variant="title" numberOfLines={2}>
            {nome}
          </AppText>
          <AppText variant="caption" numberOfLines={1}>
            {email}
          </AppText>
          <View style={styles.badges}>
            <Badge
              label={tipo === 'profissional' ? 'Profissional' : tipo === 'admin' ? 'Administrador' : 'Cliente'}
              tone="primary"
            />
            {status ? (
              <Badge label={STATUS_VERIFICACAO_LABEL[status]} tone={STATUS_VERIFICACAO_TONE[status]} />
            ) : null}
          </View>
        </View>
      </Card>

      {tipo === 'profissional' && status === 'pendente' ? (
        <Notice
          tone="warning"
          title="Cadastro em análise"
          message="Seu perfil ainda não aparece na busca. Você pode completar serviços e agenda enquanto aguarda a aprovação."
        />
      ) : null}

      {tipo === 'profissional' && status === 'reprovado' ? (
        <Notice
          tone="danger"
          title="Cadastro reprovado"
          message="Atualize seus documentos e dados no perfil. Se precisar, entre em contato com o suporte."
        />
      ) : null}

      {tipo === 'cliente' && perfil?.endereco ? (
        <Card style={styles.endereco}>
          <View style={styles.enderecoLinha}>
            <Ionicons name="home-outline" size={20} color={colors.primary} />
            <View style={styles.enderecoTexto}>
              <AppText variant="bodyStrong" numberOfLines={1}>
                {perfil.endereco.rua}, {perfil.endereco.numero}
              </AppText>
              <AppText variant="caption" numberOfLines={1}>
                {perfil.endereco.bairro}, {perfil.endereco.cidade} · CEP {perfil.endereco.cep}
              </AppText>
            </View>
          </View>
          <Button
            label="Editar endereço"
            onPress={() => router.push('/endereco')}
            variant="ghost"
            icon="create-outline"
            fullWidth={false}
          />
        </Card>
      ) : null}

      <SectionHeader title="Sua conta" subtitle="Acesse os recursos do seu perfil" />

      <View style={styles.menu}>
        {itens.map((item) => (
          <Pressable
            key={item.rota + item.titulo}
            onPress={() => router.push(item.rota)}
            accessibilityRole="button"
            accessibilityLabel={`${item.titulo}. ${item.descricao}`}
            style={({ pressed }) => [styles.menuItem, pressed && styles.pressionado]}
          >
            <View style={styles.menuIcone}>
              <Ionicons name={item.icon} size={22} color={colors.primary} />
            </View>
            <View style={styles.menuTexto}>
              <AppText variant="bodyStrong">{item.titulo}</AppText>
              <AppText variant="caption" numberOfLines={2}>
                {item.descricao}
              </AppText>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </Pressable>
        ))}

        <Pressable
          onPress={() => router.push('/configuracoes')}
          accessibilityRole="button"
          accessibilityLabel="Configurações, acessibilidade e privacidade"
          style={({ pressed }) => [styles.menuItem, pressed && styles.pressionado]}
        >
          <View style={styles.menuIcone}>
            <Ionicons name="settings-outline" size={22} color={colors.primary} />
          </View>
          <View style={styles.menuTexto}>
            <AppText variant="bodyStrong">Configurações</AppText>
            <AppText variant="caption">Acessibilidade, privacidade e dados locais</AppText>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
        </Pressable>
      </View>

      <Button
        label="Sair da conta"
        onPress={() => setSairAberto(true)}
        variant="outline"
        icon="log-out-outline"
        style={styles.sair}
      />

      <AppText variant="caption" center style={styles.versao}>
        Beleza a Domicílio · versão 1.0.0
      </AppText>

      <Dialog
        visible={sairAberto}
        onClose={() => setSairAberto(false)}
        title="Sair da conta?"
        message="Você precisará entrar novamente para acessar seus agendamentos."
        dismissible={!saindo}
        actions={[
          {
            label: 'Cancelar',
            onPress: () => setSairAberto(false),
            variant: 'ghost',
            disabled: saindo,
          },
          {
            label: 'Sair',
            onPress: () => void sair(),
            variant: 'danger',
            loading: saindo,
          },
        ]}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  cabecalho: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  dados: { flex: 1, gap: 2 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.xs },
  endereco: { marginTop: spacing.md, gap: spacing.sm, alignItems: 'flex-start' },
  enderecoLinha: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  enderecoTexto: { flex: 1, gap: 2 },
  menu: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: minTouchTarget + 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  pressionado: { backgroundColor: colors.surfaceAlt },
  menuIcone: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuTexto: { flex: 1, gap: 1 },
  sair: { marginTop: spacing.xl },
  versao: { marginTop: spacing.lg },
});
