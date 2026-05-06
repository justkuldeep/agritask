/**
 * Login Screen — Phone number entry → OTP flow
 * Mirrors the web auth flow: send-otp → verify-otp
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { authAPI } from '../../services/api';
import { useAuth } from '../../services/authStore';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { Colors, Spacing, Typography, Radius } from '../../constants/theme';

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { login } = useAuth();

  const [step, setStep] = useState('phone'); // 'phone' | 'otp'
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendTimer, setResendTimer] = useState(0);

  // ── Send OTP ──────────────────────────────────────────────────────────────

  async function handleSendOTP() {
    const cleaned = mobile.trim().replace(/\s/g, '');
    if (!/^[6-9]\d{9}$/.test(cleaned)) {
      setError('Enter a valid 10-digit Indian mobile number');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await authAPI.sendOTP(cleaned);
      setStep('otp');
      startResendTimer();
    } catch (err) {
      setError(err.message || 'Failed to send OTP. Try again.');
    } finally {
      setLoading(false);
    }
  }

  // ── Verify OTP ────────────────────────────────────────────────────────────

  async function handleVerifyOTP() {
    if (otp.trim().length < 4) {
      setError('Enter the OTP sent to your number');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await authAPI.verifyOTP(mobile.trim(), otp.trim());
      await login(res.data);
      router.replace('/(tabs)');
    } catch (err) {
      setError(err.message || 'Invalid OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function startResendTimer() {
    setResendTimer(60);
    const interval = setInterval(() => {
      setResendTimer((t) => {
        if (t <= 1) {
          clearInterval(interval);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  }

  function handleResend() {
    setOtp('');
    setError('');
    handleSendOTP();
  }

  function handleBack() {
    setStep('phone');
    setOtp('');
    setError('');
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + Spacing.xxl, paddingBottom: insets.bottom + Spacing.xxl },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Logo / Brand */}
        <View style={styles.brand}>
          <LinearGradient
            colors={['#22c55e', '#16a34a']}
            style={styles.logoCircle}
          >
            <Text style={styles.logoEmoji}>🌾</Text>
          </LinearGradient>
          <Text style={styles.appName}>AgriTask</Text>
          <Text style={styles.tagline}>PGA Field Management</Text>
        </View>

        {/* Card */}
        <View style={styles.card}>
          {step === 'phone' ? (
            <>
              <Text style={styles.cardTitle}>Welcome back</Text>
              <Text style={styles.cardSubtitle}>
                Enter your registered mobile number to continue
              </Text>

              <Input
                label="Mobile Number"
                value={mobile}
                onChangeText={(v) => {
                  setMobile(v);
                  setError('');
                }}
                placeholder="9876543210"
                keyboardType="phone-pad"
                maxLength={10}
                error={error}
                hint="10-digit Indian mobile number"
              />

              <Button
                title="Send OTP"
                onPress={handleSendOTP}
                loading={loading}
                fullWidth
                size="lg"
                style={styles.submitBtn}
              />
            </>
          ) : (
            <>
              <TouchableOpacity onPress={handleBack} style={styles.backRow}>
                <Text style={styles.backArrow}>←</Text>
                <Text style={styles.backText}>Change number</Text>
              </TouchableOpacity>

              <Text style={styles.cardTitle}>Verify OTP</Text>
              <Text style={styles.cardSubtitle}>
                Enter the 6-digit code sent to{' '}
                <Text style={styles.highlight}>+91 {mobile}</Text>
              </Text>

              <Input
                label="One-Time Password"
                value={otp}
                onChangeText={(v) => {
                  setOtp(v);
                  setError('');
                }}
                placeholder="• • • • • •"
                keyboardType="number-pad"
                maxLength={6}
                error={error}
              />

              <Button
                title="Verify & Login"
                onPress={handleVerifyOTP}
                loading={loading}
                fullWidth
                size="lg"
                style={styles.submitBtn}
              />

              {/* Resend */}
              <View style={styles.resendRow}>
                <Text style={styles.resendLabel}>Didn't receive it? </Text>
                {resendTimer > 0 ? (
                  <Text style={styles.resendTimer}>Resend in {resendTimer}s</Text>
                ) : (
                  <TouchableOpacity onPress={handleResend}>
                    <Text style={styles.resendLink}>Resend OTP</Text>
                  </TouchableOpacity>
                )}
              </View>
            </>
          )}
        </View>

        <Text style={styles.footer}>
          PGA AgriTask v1.0 · Secure Login
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: Spacing.base,
    justifyContent: 'center',
  },
  brand: {
    alignItems: 'center',
    marginBottom: Spacing.xxxl,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  logoEmoji: {
    fontSize: 36,
  },
  appName: {
    fontSize: Typography.display,
    fontWeight: Typography.extrabold,
    color: Colors.textPrimary,
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: Typography.sm,
    color: Colors.textMuted,
    marginTop: 4,
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  cardTitle: {
    fontSize: Typography.xxl,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  cardSubtitle: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.xl,
    lineHeight: 20,
  },
  highlight: {
    color: Colors.primary,
    fontWeight: Typography.semibold,
  },
  submitBtn: {
    marginTop: Spacing.sm,
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.base,
  },
  backArrow: {
    fontSize: Typography.lg,
    color: Colors.textSecondary,
    marginRight: Spacing.xs,
  },
  backText: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
  },
  resendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.base,
  },
  resendLabel: {
    fontSize: Typography.sm,
    color: Colors.textMuted,
  },
  resendTimer: {
    fontSize: Typography.sm,
    color: Colors.textMuted,
  },
  resendLink: {
    fontSize: Typography.sm,
    color: Colors.primary,
    fontWeight: Typography.semibold,
  },
  footer: {
    textAlign: 'center',
    fontSize: Typography.xs,
    color: Colors.textMuted,
    marginTop: Spacing.xl,
  },
});
