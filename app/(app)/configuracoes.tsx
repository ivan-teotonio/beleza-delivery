import React, { useState } from 'react';
import { Share, StyleSheet, View } from 'react-native';
import { Screen } from '../../src/components/Screen';
import { PageHeader } from '../../src/components/PageHeader';
import { Card } from '../../src/components/Card';
import { AppText } from '../../src/components/AppText';
import { Button } from '../../src/components/Button';
import { Notice } from '../../src/components/Notice';
import { SectionHeader } from '../../src/components/SectionHeader';
import { exportarDadosLocais } from '../../src/lib/offline/db';
import { useAccessibility } from '../../src/providers/AccessibilityProvider';
import { useToast } from '../../src/providers/ToastProvider';
import { spacing } from '../../src/theme';

export default function Configuracoes() {
  const { fontScale, aumentar, diminuir, restaurar, podeAumentar, podeDiminuir } =
    useAccessibility();
  const { showToast } = useToast();
  const [exportando, setExportando] = useState(false);

  async function exportar() {
    setExportando(true);
    try {
      const dados = await exportarDadosLocais();
      const json = JSON.stringify(dados, null, 2);
      await Share.share({
        title: 'Meus dados locais - Beleza a Domicílio',
        message: json,
      });
    } catch {
      showToast('Não foi possível exportar os dados locais.', 'error');
    } finally {
      setExportando(false);
    }
  }

  const tamanhoLabel =
    fontScale <= 1 ? 'Padrão' : fontScale <= 1.16 ? 'Grande' : 'Extra grande';

  return (
    <Screen>
      <PageHeader title="Configurações" subtitle="Acessibilidade e privacidade" />

      <SectionHeader title="Acessibilidade" subtitle="Ajustes visuais para facilitar a leitura" />
      <Card style={styles.bloco}>
        <AppText variant="bodyStrong">Tamanho do texto: {tamanhoLabel}</AppText>
        <AppText variant="caption">
          O aplicativo respeita as configurações de acessibilidade do sistema. Use estes controles para um ajuste adicional.
        </AppText>
        <View style={styles.linha}>
          <Button
            label="Diminuir"
            onPress={diminuir}
            variant="outline"
            icon="remove-outline"
            disabled={!podeDiminuir}
            fullWidth={false}
            style={styles.botao}
          />
          <Button
            label="Aumentar"
            onPress={aumentar}
            variant="outline"
            icon="add-outline"
            disabled={!podeAumentar}
            fullWidth={false}
            style={styles.botao}
          />
        </View>
        {fontScale !== 1 ? (
          <Button label="Restaurar padrão" onPress={restaurar} variant="ghost" fullWidth={false} />
        ) : null}
      </Card>

      <SectionHeader title="Privacidade e dados" subtitle="LGPD e controle dos seus dados" />
      <Card style={styles.bloco}>
        <Notice
          tone="info"
          message="Seus dados de conta e agendamentos ficam no Supabase com controles de acesso. Dados sensíveis, como endereço completo, só são liberados conforme as regras do serviço."
        />
        <Button
          label={exportando ? 'Exportando...' : 'Exportar dados salvos neste aparelho'}
          onPress={() => void exportar()}
          variant="secondary"
          icon="download-outline"
          loading={exportando}
          disabled={exportando}
        />
        <AppText variant="caption">
          A exportação inclui o cache local e a fila de sincronização deste dispositivo. Para solicitar exclusão da conta no servidor, entre em contato com o suporte do aplicativo.
        </AppText>
      </Card>

      <AppText variant="caption" center style={styles.versao}>
        Beleza a Domicílio 1.0.0
      </AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  bloco: { gap: spacing.md, marginBottom: spacing.lg },
  linha: { flexDirection: 'row', gap: spacing.sm },
  botao: { flex: 1 },
  versao: { marginTop: spacing.md },
});
