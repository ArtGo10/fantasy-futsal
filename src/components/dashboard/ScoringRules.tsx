import { Text, View } from "react-native";

import { styles } from "../../styles";

export function ScoringRules() {
  return (
    <View style={styles.scoringRules}>
      <Text style={styles.scoringRulesTitle}>Система начисления очков</Text>
      <Text style={styles.scoringRulesText}>
        Матчи: победа +3, ничья +1, поражение 0. Победа после дополнительного времени считается победой.
      </Text>
      <Text style={styles.scoringRulesText}>
        Если матч решился по пенальти после ничьей, за сам матч обе команды получают по 1 очку. Победитель серии
        получает только бонус за проход дальше.
      </Text>
      <Text style={styles.scoringRulesText}>
        Бонусы за проход стадий: 1/16 финала +3, 1/8 финала +4, 1/4 финала +5, полуфинал +6, финал +8, победа в
        турнире +10.
      </Text>
      <Text style={styles.scoringRulesText}>
        Победитель матча за 3-е место получает дополнительный бонус +3 сверх очков за сам матч.
      </Text>
      <Text style={styles.scoringRulesText}>
        Бонусы суммируются с очками за матчи и добавляются к команде, которая дошла до соответствующей стадии.
      </Text>
    </View>
  );
}
