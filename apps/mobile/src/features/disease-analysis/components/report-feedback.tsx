import * as Haptics from 'expo-haptics';
import { Check, ThumbsDown, ThumbsUp } from 'lucide-react-native';
import { useState } from 'react';
import { TextInput } from 'react-native';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { PressableScale } from '@/components/ui/pressable-scale';
import { SectionLabel } from '@/components/ui/section-label';
import { TextButton } from '@/components/ui/text-button';
import { useTheme } from '@/hooks/use-theme';
import { palette } from '@/theme/colors';
import { Text, View } from '@/tw';

import { feedbackConfirmation, type FeedbackVote } from './report-feedback.helpers';

const COMMENT_MAX = 300;

/**
 * Demo-only "Was this helpful?" card for the report detail screen. All state is
 * local: it resets when the screen unmounts. No API / store wiring yet — that's
 * a future iteration. Strings are plain English to match `reports/[id].tsx`.
 */
export function ReportFeedback() {
  const theme = useTheme();
  const [vote, setVote] = useState<FeedbackVote | null>(null);
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const selectVote = (next: FeedbackVote) => {
    Haptics.selectionAsync().catch(() => undefined);
    setVote(next);
  };

  const submit = () => {
    if (!vote) return;
    Haptics.selectionAsync().catch(() => undefined);
    setSubmitted(true);
  };

  // State C — thank-you confirmation.
  if (submitted && vote) {
    return (
      <Card padding="md">
        <View className="flex-row items-start gap-3">
          <View className="h-9 w-9 items-center justify-center rounded-full bg-brand-100">
            <Check size={18} color={palette.brand[700]} strokeWidth={2.6} />
          </View>
          <View className="flex-1 gap-0.5">
            <Text className="text-base font-bold text-text">Thanks for your feedback</Text>
            <Text className="text-sm text-text-muted">{feedbackConfirmation(vote)}</Text>
            {comment.trim().length > 0 ? (
              <Text className="mt-1 text-sm leading-5 text-text">
                &ldquo;{comment.trim()}&rdquo;
              </Text>
            ) : null}
            <TextButton
              label="Edit"
              size="sm"
              className="mt-2"
              onPress={() => setSubmitted(false)}
            />
          </View>
        </View>
      </Card>
    );
  }

  // States A & B — prompt and (once voted) comment + submit.
  return (
    <Card padding="md">
      <View className="gap-3">
        <SectionLabel>Was this helpful?</SectionLabel>

        <View className="flex-row gap-2">
          <VoteButton
            label="Yes"
            icon={
              <ThumbsUp
                size={18}
                color={vote === 'up' ? '#fff' : palette.brand[700]}
                strokeWidth={2.2}
              />
            }
            selected={vote === 'up'}
            onPress={() => selectVote('up')}
          />
          <VoteButton
            label="No"
            icon={
              <ThumbsDown
                size={18}
                color={vote === 'down' ? '#fff' : palette.brand[700]}
                strokeWidth={2.2}
              />
            }
            selected={vote === 'down'}
            onPress={() => selectVote('down')}
          />
        </View>

        {vote ? (
          <View className="gap-3">
            <View className="rounded-xl border border-border bg-surface px-3 py-2">
              <TextInput
                value={comment}
                onChangeText={(next) =>
                  next.length <= COMMENT_MAX ? setComment(next) : undefined
                }
                placeholder="Add a comment (optional)"
                placeholderTextColor={theme.textFaint}
                multiline
                textAlignVertical="top"
                style={{ minHeight: 64, color: theme.text, fontSize: 15, lineHeight: 22 }}
              />
            </View>
            <Button label="Submit" onPress={submit} />
          </View>
        ) : null}
      </View>
    </Card>
  );
}

function VoteButton({
  label,
  icon,
  selected,
  onPress,
}: {
  label: string;
  icon: React.ReactNode;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      onPress={onPress}
      haptic="none"
      pressedScale={0.96}
      className="flex-1"
    >
      <View
        className={
          selected
            ? 'flex-row items-center justify-center gap-2 rounded-2xl border border-brand-600 bg-brand-600 px-3 py-3'
            : 'flex-row items-center justify-center gap-2 rounded-2xl border border-border bg-surface px-3 py-3'
        }
      >
        {icon}
        <Text className={selected ? 'text-sm font-bold text-white' : 'text-sm font-bold text-text'}>
          {label}
        </Text>
      </View>
    </PressableScale>
  );
}
