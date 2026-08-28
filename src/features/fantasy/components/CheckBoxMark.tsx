import { Check } from "lucide-react-native";
import { View } from "react-native";

import { styles } from "../../../styles";
import { colors } from "../../../theme/tokens";
import { useFantasySeasonTheme } from "../utils/seasonThemeContext";

type CheckBoxMarkProps = {
  checked: boolean;
};

export function CheckBoxMark({ checked }: CheckBoxMarkProps) {
  const fantasyTheme = useFantasySeasonTheme();

  return (
    <View
      style={[
        styles.playerDetailCheckbox,
        checked
          ? [
              styles.playerDetailCheckboxChecked,
              {
                backgroundColor: fantasyTheme.primaryColor,
                borderColor: fantasyTheme.primaryColor,
              },
            ]
          : null,
      ]}
    >
      {checked ? (
        <Check color={colors.text.inverse} size={13} strokeWidth={3} />
      ) : null}
    </View>
  );
}
