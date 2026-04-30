import React, { useState, useRef } from "react";
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, ActivityIndicator, SafeAreaView, StatusBar, Alert,
} from "react-native";
import { Audio } from "expo-av";
import { queryStandards, voiceQuery, type QueryResponse, type StandardResult } from "../lib/api";

const EXAMPLES = [
  "33 Grade OPC cement requirements",
  "Structural steel I-sections",
  "Coarse aggregate for concrete",
  "Precast concrete pipes water mains",
];

const COLORS = {
  bg: "#0a0a0f",
  card: "#13131a",
  border: "#1e1e2e",
  accent: "#6366f1",
  muted: "#4a4a6a",
  text: "#e8e8f0",
  success: "#22c55e",
};

export default function HomeScreen() {
  const [query, setQuery] = useState("");
  const [language, setLanguage] = useState<"en" | "hi">("en");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<QueryResponse | null>(null);
  const [recording, setRecording] = useState(false);
  const recordingRef = useRef<Audio.Recording | null>(null);

  const search = async (q: string) => {
    if (!q.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await queryStandards(q, { language, include_roadmap: true });
      setResult(res);
    } catch (e: unknown) {
      Alert.alert("Error", e instanceof Error ? e.message : "Query failed. Check backend connection.");
    } finally {
      setLoading(false);
    }
  };

  const startRecording = async () => {
    try {
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      recordingRef.current = recording;
      setRecording(true);
    } catch (e) {
      Alert.alert("Microphone", "Could not access microphone.");
    }
  };

  const stopRecording = async () => {
    if (!recordingRef.current) return;
    setRecording(false);
    await recordingRef.current.stopAndUnloadAsync();
    const uri = recordingRef.current.getURI();
    recordingRef.current = null;
    if (uri) {
      setLoading(true);
      try {
        const res = await voiceQuery(uri, language);
        setQuery(res.transcribed_query || "");
        setResult(res);
      } catch (e: unknown) {
        Alert.alert("Voice Error", e instanceof Error ? e.message : "Voice query failed");
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: COLORS.bg }]}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>⬡ BIS Co-pilot</Text>
          <Text style={styles.subtitle}>Find BIS standards for your product</Text>
        </View>

        {/* Search */}
        <View style={styles.card}>
          <TextInput
            style={styles.input}
            placeholder="Describe your product or material..."
            placeholderTextColor={COLORS.muted}
            value={query}
            onChangeText={setQuery}
            multiline
            returnKeyType="search"
          />
          <View style={styles.inputActions}>
            <TouchableOpacity
              style={[styles.btn, styles.btnSecondary]}
              onPressIn={startRecording}
              onPressOut={stopRecording}
            >
              <Text style={styles.btnSecondaryText}>
                {recording ? "🔴 Recording..." : "🎤 Hold to speak"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btn, styles.btnSecondary]}
              onPress={() => setLanguage(l => l === "en" ? "hi" : "en")}
            >
              <Text style={styles.btnSecondaryText}>
                {language === "en" ? "🇮🇳 Hindi" : "🇬🇧 English"}
              </Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={[styles.btn, styles.btnPrimary, (!query.trim() || loading) && styles.btnDisabled]}
            onPress={() => search(query)}
            disabled={!query.trim() || loading}
          >
            {loading ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <Text style={styles.btnPrimaryText}>Find Standards →</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Examples */}
        {!result && (
          <View style={styles.examples}>
            {EXAMPLES.map((ex) => (
              <TouchableOpacity
                key={ex}
                style={styles.chip}
                onPress={() => { setQuery(ex); search(ex); }}
              >
                <Text style={styles.chipText}>{ex}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Results */}
        {result && (
          <View>
            <Text style={styles.resultsMeta}>
              {result.results.length} standards · {result.latency_seconds.toFixed(2)}s
            </Text>
            {result.results.map((r, i) => (
              <ResultCard key={r.is_code_formatted} result={r} index={i} />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function ResultCard({ result, index }: { result: StandardResult; index: number }) {
  const [expanded, setExpanded] = useState(index === 0);
  const conf = Math.round(result.confidence * 100);

  return (
    <TouchableOpacity style={styles.resultCard} onPress={() => setExpanded(!expanded)} activeOpacity={0.8}>
      <View style={styles.resultHeader}>
        <View style={styles.resultIndex}>
          <Text style={styles.resultIndexText}>{index + 1}</Text>
        </View>
        <View style={styles.resultMeta}>
          <Text style={styles.isCode}>{result.is_code_formatted}</Text>
          <Text style={styles.resultTitle}>{result.title}</Text>
          <Text style={styles.sectionName}>{result.section_name}</Text>
        </View>
        <Text style={styles.confidence}>{conf}%</Text>
      </View>

      {expanded && (
        <View style={styles.resultBody}>
          {result.rationale && (
            <Text style={styles.rationale}>{result.rationale}</Text>
          )}
          {result.roadmap && (
            <View style={styles.roadmap}>
              <Text style={styles.roadmapTitle}>Compliance Roadmap</Text>
              <Text style={styles.roadmapItem}>📋 {result.roadmap.license_type}</Text>
              <Text style={styles.roadmapItem}>⏱ {result.roadmap.timeline_weeks} weeks</Text>
              <Text style={styles.roadmapItem}>💰 {result.roadmap.estimated_cost_inr}</Text>
              {result.roadmap.msme_tip && (
                <Text style={styles.msme_tip}>💡 {result.roadmap.msme_tip}</Text>
              )}
            </View>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { padding: 16, paddingBottom: 40 },
  header: { alignItems: "center", marginBottom: 20, marginTop: 10 },
  title: { fontSize: 24, fontWeight: "700", color: "#e8e8f0" },
  subtitle: { fontSize: 13, color: COLORS.muted, marginTop: 4 },
  card: { backgroundColor: COLORS.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: COLORS.border, marginBottom: 16 },
  input: { color: COLORS.text, fontSize: 14, minHeight: 70, textAlignVertical: "top" },
  inputActions: { flexDirection: "row", gap: 8, marginVertical: 12, flexWrap: "wrap" },
  btn: { borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10, alignItems: "center" },
  btnPrimary: { backgroundColor: COLORS.accent },
  btnPrimaryText: { color: "white", fontWeight: "600", fontSize: 14 },
  btnSecondary: { borderWidth: 1, borderColor: COLORS.border, flex: 1 },
  btnSecondaryText: { color: COLORS.muted, fontSize: 12 },
  btnDisabled: { opacity: 0.4 },
  examples: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  chip: { backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  chipText: { color: COLORS.muted, fontSize: 12 },
  resultsMeta: { color: COLORS.muted, fontSize: 12, marginBottom: 12 },
  resultCard: { backgroundColor: COLORS.card, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: COLORS.border, marginBottom: 10 },
  resultHeader: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  resultIndex: { width: 24, height: 24, borderRadius: 8, backgroundColor: "#6366f120", alignItems: "center", justifyContent: "center" },
  resultIndexText: { color: COLORS.accent, fontSize: 11, fontWeight: "700" },
  resultMeta: { flex: 1 },
  isCode: { color: "#a5b4fc", fontFamily: "monospace", fontSize: 13, fontWeight: "600" },
  resultTitle: { color: COLORS.text, fontSize: 13, fontWeight: "500", marginTop: 2 },
  sectionName: { color: COLORS.muted, fontSize: 11, marginTop: 2 },
  confidence: { color: COLORS.muted, fontSize: 11 },
  resultBody: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: COLORS.border },
  rationale: { color: "#cbd5e1", fontSize: 12, lineHeight: 18 },
  roadmap: { backgroundColor: "#6366f108", borderRadius: 10, padding: 10, borderWidth: 1, borderColor: "#6366f120", marginTop: 10 },
  roadmapTitle: { color: COLORS.accent, fontSize: 11, fontWeight: "600", marginBottom: 6 },
  roadmapItem: { color: COLORS.text, fontSize: 12, marginBottom: 3 },
  msme_tip: { color: "#fde68a", fontSize: 11, marginTop: 6, fontStyle: "italic" },
});
