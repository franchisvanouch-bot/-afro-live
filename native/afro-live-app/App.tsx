import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import IMGLYEditor, {
  EditorPreset,
  EditorSettingsModel,
  SourceType,
} from '@imgly/editor-react-native';

export default function App() {
  const [opening, setOpening] = useState(false);
  const [lastExport, setLastExport] = useState<string | null>(null);

  const openVideoStudio = async () => {
    if (opening) return;
    setOpening(true);

    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          'Autorisation nécessaire',
          'Autorise AFRO LIVE à accéder à ta galerie pour choisir une vidéo.'
        );
        return;
      }

      const selection = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['videos'],
        allowsEditing: false,
        quality: 1,
        videoMaxDuration: 180,
      });

      if (selection.canceled || !selection.assets?.[0]) return;

      const video = selection.assets[0];
      const settings = new EditorSettingsModel({
        // Evaluation mode: no commercial key; IMG.LY adds its watermark.
        license: undefined,
      });

      const result = await IMGLYEditor.openEditor(
        settings,
        { source: video.uri, type: SourceType.VIDEO },
        EditorPreset.VIDEO,
        { product: 'AFRO LIVE', prototype: true }
      );

      if (result?.artifact) {
        setLastExport(result.artifact);
        Alert.alert(
          'Montage exporté',
          'Le fichier a été exporté sur cet appareil. La connexion à Supabase et la publication seront ajoutées après validation du prototype.'
        );
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Une erreur inconnue est survenue.';
      Alert.alert('Impossible d’ouvrir le studio', message);
    } finally {
      setOpening(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#080808" />
      <View style={styles.page}>
        <View style={styles.topLine}>
          <View style={styles.logoMark}><Text style={styles.logoMarkText}>A</Text></View>
          <View>
            <Text style={styles.brand}>AFRO <Text style={styles.orange}>LIVE</Text></Text>
            <Text style={styles.eyebrow}>STUDIO CRÉATEUR · PROTOTYPE NATIF</Text>
          </View>
          <View style={styles.beta}><Text style={styles.betaText}>BÊTA</Text></View>
        </View>

        <View style={styles.hero}>
          <Text style={styles.kicker}>TON CONTENU. TON STYLE.</Text>
          <Text style={styles.title}>Crée quelque chose qui{"\n"}se remarque.</Text>
          <Text style={styles.subtitle}>
            Un studio vidéo pensé pour les créateurs AFRO LIVE : montage, musique,
            textes, effets et formats verticaux.
          </Text>
          <View style={styles.featureRow}>
            <View style={styles.feature}><Text style={styles.featureIcon}>✂</Text><Text style={styles.featureText}>Montage</Text></View>
            <View style={styles.feature}><Text style={styles.featureIcon}>♫</Text><Text style={styles.featureText}>Audio</Text></View>
            <View style={styles.feature}><Text style={styles.featureIcon}>✦</Text><Text style={styles.featureText}>Effets</Text></View>
            <View style={styles.feature}><Text style={styles.featureIcon}>T</Text><Text style={styles.featureText}>Texte</Text></View>
          </View>
        </View>

        <View style={styles.editorCard}>
          <View style={styles.cardTop}>
            <View>
              <Text style={styles.cardEyebrow}>ESPACE CRÉATION</Text>
              <Text style={styles.cardTitle}>Studio vidéo</Text>
            </View>
            <View style={styles.videoIcon}><Text style={styles.videoIconText}>▶</Text></View>
          </View>
          <Text style={styles.cardBody}>
            Choisis une vidéo dans ta galerie. L’éditeur natif IMG.LY s’ouvrira pour
            tester la timeline, les outils et l’export.
          </Text>
          <Pressable
            accessibilityRole="button"
            disabled={opening}
            onPress={openVideoStudio}
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && styles.pressed,
              opening && styles.disabled,
            ]}
          >
            {opening ? (
              <ActivityIndicator color="#080808" />
            ) : (
              <>
                <Text style={styles.primaryButtonText}>Choisir une vidéo</Text>
                <Text style={styles.primaryArrow}>↗</Text>
              </>
            )}
          </Pressable>
          <Text style={styles.trialNote}>MODE D’ÉVALUATION IMG.LY · FILIGRANE ACTIVÉ</Text>
        </View>

        <View style={styles.statusCard}>
          <View style={styles.statusDot} />
          <View style={styles.statusCopy}>
            <Text style={styles.statusTitle}>Version de test indépendante</Text>
            <Text style={styles.statusBody}>La PWA publique AFRO LIVE n’est pas modifiée.</Text>
          </View>
        </View>

        {lastExport ? (
          <Text numberOfLines={2} style={styles.exportPath}>Dernier export local : {lastExport}</Text>
        ) : null}

        <View style={styles.footer}>
          <Text style={styles.footerText}>AFRO LIVE</Text>
          <Text style={styles.footerText}>CRÉER · EXPRIMER · PARTAGER</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#080808' },
  page: { flex: 1, paddingHorizontal: 22, paddingTop: 18, paddingBottom: 16 },
  topLine: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  logoMark: { width: 42, height: 42, borderRadius: 13, backgroundColor: '#ff6a00', alignItems: 'center', justifyContent: 'center' },
  logoMarkText: { color: '#080808', fontSize: 27, fontWeight: '900' },
  brand: { color: '#fff', fontSize: 17, fontWeight: '900', letterSpacing: 1.2 },
  orange: { color: '#ff6a00' },
  eyebrow: { color: '#888', fontSize: 9, letterSpacing: 1.1, marginTop: 2, fontWeight: '700' },
  beta: { marginLeft: 'auto', borderWidth: 1, borderColor: '#553019', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 },
  betaText: { color: '#ff8b3d', fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  hero: { marginTop: 54, marginBottom: 28 },
  kicker: { color: '#ff7a1a', fontSize: 10, letterSpacing: 2.2, fontWeight: '900', marginBottom: 12 },
  title: { color: '#fff', fontSize: 34, lineHeight: 39, fontWeight: '900', letterSpacing: -1.1 },
  subtitle: { color: '#aaa', fontSize: 14, lineHeight: 21, marginTop: 14, maxWidth: 330 },
  featureRow: { flexDirection: 'row', gap: 9, marginTop: 22, flexWrap: 'wrap' },
  feature: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#171717', borderWidth: 1, borderColor: '#282828', borderRadius: 30, paddingVertical: 8, paddingHorizontal: 11 },
  featureIcon: { color: '#ff7a1a', fontWeight: '900', fontSize: 13 },
  featureText: { color: '#ddd', fontSize: 11, fontWeight: '700' },
  editorCard: { backgroundColor: '#151515', borderColor: '#303030', borderWidth: 1, borderRadius: 22, padding: 19 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardEyebrow: { color: '#ff7a1a', fontSize: 9, fontWeight: '900', letterSpacing: 1.5 },
  cardTitle: { color: '#fff', fontSize: 23, fontWeight: '900', marginTop: 5 },
  videoIcon: { width: 44, height: 44, borderRadius: 15, backgroundColor: '#2b1a10', borderWidth: 1, borderColor: '#613015', alignItems: 'center', justifyContent: 'center' },
  videoIconText: { color: '#ff7a1a', fontSize: 18, marginLeft: 2 },
  cardBody: { color: '#aaa', fontSize: 13, lineHeight: 20, marginTop: 16 },
  primaryButton: { minHeight: 54, borderRadius: 14, backgroundColor: '#ff6a00', marginTop: 20, paddingHorizontal: 17, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pressed: { opacity: 0.82, transform: [{ scale: 0.99 }] },
  disabled: { opacity: 0.6 },
  primaryButtonText: { color: '#080808', fontSize: 15, fontWeight: '900' },
  primaryArrow: { color: '#080808', fontSize: 22, fontWeight: '900' },
  trialNote: { color: '#777', fontSize: 8, fontWeight: '800', letterSpacing: 1.15, textAlign: 'center', marginTop: 13 },
  statusCard: { flexDirection: 'row', alignItems: 'center', gap: 11, marginTop: 17, padding: 14, backgroundColor: '#101010', borderRadius: 15, borderWidth: 1, borderColor: '#242424' },
  statusDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: '#31c777' },
  statusCopy: { flex: 1 },
  statusTitle: { color: '#eee', fontSize: 12, fontWeight: '800' },
  statusBody: { color: '#888', fontSize: 11, marginTop: 3 },
  exportPath: { color: '#777', fontSize: 9, marginTop: 9 },
  footer: { marginTop: 'auto', paddingTop: 20, flexDirection: 'row', justifyContent: 'space-between' },
  footerText: { color: '#666', fontSize: 8, letterSpacing: 1.1, fontWeight: '800' },
});
