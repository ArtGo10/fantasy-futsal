import { Check } from "lucide-react-native";
import { View } from "react-native";

import { styles } from "../../../styles";
import { colors } from "../../../theme/tokens";

type CheckBoxMarkProps = {
  checked: boolean;
};

export function CheckBoxMark({ checked }: CheckBoxMarkProps) {
  return (
    <View
      style={[
        styles.playerDetailCheckbox,
        checked ? styles.playerDetailCheckboxChecked : null,
      ]}
    >
      {checked ? (
        <Check color={colors.text.inverse} size={13} strokeWidth={3} />
      ) : null}
    </View>
  );
}
