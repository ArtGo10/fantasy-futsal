import { FlashList } from "@shopify/flash-list";
import { Check, ChevronDown, Star } from "lucide-react-native";
import { useCallback, useDeferredValue, useMemo, useState } from "react";
import {
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from "react-native";

import type { Id } from "../../../../convex/_generated/dataModel";
import { ClearableTextInput } from "../../../components/common/ClearableTextInput";
import { WEB_DESKTOP_MIN_WIDTH } from "../../../constants";
import { useI18n } from "../../../i18n/I18nProvider";
import { useDismissKeyboardOnChange } from "../../../hooks/useDismissKeyboardOnChange";
import type { TranslationKey } from "../../../i18n/translations";
import { styles } from "../../../styles";
import { colors } from "../../../theme/tokens";
import { BottomSheet } from "../components/BottomSheet";
import { DesktopSelect } from "../components/DesktopSelect";
import {
  FANTASY_PLAYER_LIST_ITEM_HEIGHT,
  FantasyClubLogo,
  FantasyPlayerListRow,
  FantasyPlayerListSeparator,
} from "../components/FantasyPlayerListRow";
import { PlayerDetailSheet } from "../components/PlayerDetailSheet";
import { formatFantasyMoney } from "../utils/money";

type PlayerPosition = "goalkeeper" | "universal";
type PlayerStatus =
  | "active"
  | "doubtful"
  | "injured"
  | "suspended"
  | "unavailable"
  | "left";
type Translate = (key: TranslationKey) => string;

type FantasyClub = {
  id: Id<"fantasyClubs">;
  isActive: boolean;
  logoThumbnailUrl: string | null;
  logoUrl: string | null;
  name: string;
  shortName: string | null;
  sortOrder: number;
};

type FantasyPlayer = {
  clubId: Id<"fantasyClubs"> | null;
  clubName: string | null;
  displayName: string;
  firstName: string | null;
  id: Id<"fantasyPlayers">;
  lastName: string;
  photoThumbnailUrl: string | null;
  photoUrl: string | null;
  appearances: number;
  assists: number;
  averagePointsPerGameweek: number;
  goals: number;
  lastGameweekPoints: number;
  penaltiesMissed: number;
  penaltiesSaved: number;
  position: PlayerPosition;
  price: number;
  previousPrice: number | null;
  priceChangedAt: number | null;
  priceDelta: number;
  redCards: number;
  seasonPoints: number;
  selectedByTeams: number;
  selectedPercent: number;
  status: PlayerStatus;
  statusDetails?: {
    message?: string | null;
    messageEn?: string | null;
    messageUk?: string | null;
    updatedAt?: number | null;
  } | null;
  statusMessage?: string | null;
  yellowCards: number;
};

type MarketScreenProps = {
  clubs: FantasyClub[] | undefined;
  favoritePlayerIds: Id<"fantasyPlayers">[] | undefined;
  onToggleFavorite: (
    playerId: Id<"fantasyPlayers">,
    isFavorite: boolean,
  ) => void;
  players: FantasyPlayer[] | undefined;
};

const MARKET_ALL_CLUBS_VALUE = "__all_clubs__";
const MARKET_FREE_AGENTS_VALUE = "__free_agents__";
type MarketClubFilterValue =
  | Id<"fantasyClubs">
  | typeof MARKET_FREE_AGENTS_VALUE
  | null;

const POSITION_LABEL_KEYS: Record<PlayerPosition, TranslationKey> = {
  goalkeeper: "players.position.goalkeeper",
  universal: "players.position.universal",
};

function normalizeSearchValue(value: string | null | undefined) {
  return (value ?? "").trim().toLocaleLowerCase();
}

export function MarketScreen({
  clubs,
  favoritePlayerIds,
  onToggleFavorite,
  players,
}: MarketScreenProps) {
  const { t } = useI18n();
  const { width: windowWidth } = useWindowDimensions();
  const isDesktopWeb =
    Platform.OS === "web" && windowWidth >= WEB_DESKTOP_MIN_WIDTH;
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [isClubPickerOpen, setClubPickerOpen] = useState(false);
  const [selectedClubId, setSelectedClubId] =
    useState<MarketClubFilterValue>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<FantasyPlayer | null>(
    null,
  );
  const [searchQuery, setSearchQuery] = useState("");
  const normalizedSearchQuery = normalizeSearchValue(searchQuery);
  const deferredFavoritesOnly = useDeferredValue(favoritesOnly);
  const deferredSelectedClubId = useDeferredValue(selectedClubId);
  const deferredSearchQuery = useDeferredValue(normalizedSearchQuery);
  const favoriteIdSet = useMemo(
    () => new Set(favoritePlayerIds ?? []),
    [favoritePlayerIds],
  );
  const activeClubs = useMemo(
    () =>
      [...(clubs ?? [])]
        .filter((club) => club.isActive)
        .sort(
          (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name),
        ),
    [clubs],
  );
  const clubsById = useMemo(
    () => new Map(activeClubs.map((club) => [club.id, club])),
    [activeClubs],
  );
  const selectedClubIsFreeAgents = selectedClubId === MARKET_FREE_AGENTS_VALUE;
  const selectedClub = useMemo(
    () =>
      selectedClubId && selectedClubId !== MARKET_FREE_AGENTS_VALUE
        ? (clubsById.get(selectedClubId) ?? null)
        : null,
    [clubsById, selectedClubId],
  );

  const sortedPlayers = useMemo(
    () =>
      [...(players ?? [])].sort(
        (a, b) =>
          b.price - a.price || a.displayName.localeCompare(b.displayName),
      ),
    [players],
  );

  const filteredPlayers = useMemo(() => {
    return sortedPlayers
      .filter(
        (player) => !deferredFavoritesOnly || favoriteIdSet.has(player.id),
      )
      .filter((player) => {
        if (deferredSelectedClubId === MARKET_FREE_AGENTS_VALUE) {
          return player.clubId === null;
        }
        return !deferredSelectedClubId || player.clubId === deferredSelectedClubId;
      })
      .filter((player) => {
        if (!deferredSearchQuery) return true;

        return [
          player.displayName,
          player.clubName ?? t("players.noClub"),
          t(POSITION_LABEL_KEYS[player.position]),
          player.price.toFixed(1),
          formatFantasyMoney(player.price),
        ]
          .map(normalizeSearchValue)
          .join(" ")
          .includes(deferredSearchQuery);
      });
  }, [
    deferredFavoritesOnly,
    deferredSearchQuery,
    deferredSelectedClubId,
    favoriteIdSet,
    sortedPlayers,
    t,
  ]);

  const handleSelectPlayer = useCallback((player: FantasyPlayer) => {
    Keyboard.dismiss();
    setSelectedPlayer(player);
  }, []);

  const handleToggleFavoritesOnly = useCallback(() => {
    setFavoritesOnly((current) => !current);
  }, []);

  const renderMarketPlayer = useCallback(
    ({ item }: { item: FantasyPlayer }) => (
      <FantasyPlayerListRow
        club={item.clubId ? (clubsById.get(item.clubId) ?? null) : null}
        isFavorite={favoriteIdSet.has(item.id)}
        onPress={handleSelectPlayer}
        player={item}
        t={t}
      />
    ),
    [clubsById, favoriteIdSet, handleSelectPlayer, t],
  );

  const selectedPlayerIsFavorite = selectedPlayer
    ? favoriteIdSet.has(selectedPlayer.id)
    : false;
  const teamFilterLabel = selectedClubIsFreeAgents
    ? t("players.freeAgents")
    : selectedClub
      ? (selectedClub.shortName ?? selectedClub.name)
      : t("market.teamFilter");
  const clubFilterOptions = useMemo(
    () => [
      { label: t("market.allTeams"), value: MARKET_ALL_CLUBS_VALUE },
      { label: t("players.freeAgents"), value: MARKET_FREE_AGENTS_VALUE },
      ...activeClubs.map((club) => ({
        label: club.shortName ?? club.name,
        leading: <FantasyClubLogo club={club} size="sm" />,
        value: club.id,
      })),
    ],
    [activeClubs, t],
  );

  const listHeader = useMemo(
    () => (
      <View
        style={[
          styles.marketListHeader,
          isDesktopWeb ? styles.marketListHeaderDesktop : null,
        ]}
      >
        <ClearableTextInput
          autoCapitalize="none"
          autoCorrect={false}
          clearAccessibilityLabel={t("common.clearInput")}
          containerStyle={
            isDesktopWeb ? styles.marketSearchInputContainerDesktop : null
          }
          onChangeText={setSearchQuery}
          placeholder={t("market.searchPlaceholder")}
          placeholderTextColor="#7F8495"
          style={[
            styles.input,
            styles.marketSearchInput,
            isDesktopWeb ? styles.marketSearchInputDesktop : null,
          ]}
          value={searchQuery}
        />

        <View
          style={[
            styles.marketFilterRow,
            isDesktopWeb ? styles.marketFilterRowDesktop : null,
          ]}
        >
          <Pressable
            accessibilityRole="button"
            onPress={handleToggleFavoritesOnly}
            style={[
              styles.marketFilterButton,
              isDesktopWeb ? styles.marketFilterButtonDesktop : null,
              favoritesOnly ? styles.marketFilterButtonActive : null,
            ]}
          >
            <Star
              color={
                favoritesOnly ? colors.text.inverse : colors.text.secondary
              }
              fill={favoritesOnly ? colors.brand.yellow : "transparent"}
              size={18}
              strokeWidth={2.4}
            />
            <Text
              style={
                favoritesOnly
                  ? styles.marketFilterTextActive
                  : styles.marketFilterText
              }
            >
              {t("market.favoriteFilter")}
            </Text>
          </Pressable>

          {isDesktopWeb ? (
            <DesktopSelect
              accessibilityLabel={t("market.teamFilter")}
              onValueChange={(value) => {
                setSelectedClubId(
                  value === MARKET_ALL_CLUBS_VALUE
                    ? null
                    : value === MARKET_FREE_AGENTS_VALUE
                      ? MARKET_FREE_AGENTS_VALUE
                      : (value as Id<"fantasyClubs">),
                );
              }}
              options={clubFilterOptions}
              style={styles.marketTeamSelectDesktop}
              value={selectedClubId ?? MARKET_ALL_CLUBS_VALUE}
            />
          ) : (
            <Pressable
              accessibilityRole="button"
              onPress={() => setClubPickerOpen(true)}
              style={[
                styles.marketFilterButton,
                selectedClubId !== null ? styles.marketFilterButtonActive : null,
              ]}
            >
              <Text
                numberOfLines={1}
                style={
                  selectedClubId !== null
                    ? styles.marketFilterTextActive
                    : styles.marketFilterText
                }
              >
                {teamFilterLabel}
              </Text>
              <ChevronDown
                color={
                  selectedClubId !== null ? colors.text.inverse : colors.text.secondary
                }
                size={18}
                strokeWidth={2.4}
              />
            </Pressable>
          )}
        </View>
      </View>
    ),
    [
      clubFilterOptions,
      favoritesOnly,
      handleToggleFavoritesOnly,
      isDesktopWeb,
      searchQuery,
      selectedClub,
      selectedClubId,
      t,
      teamFilterLabel,
    ],
  );

  const emptyState =
    players === undefined ? (
      <View style={styles.marketEmptyPanel}>
        <Text style={styles.marketEmptyTitle}>{t("players.loadingTitle")}</Text>
        <Text style={styles.mutedText}>{t("players.loadingDescription")}</Text>
      </View>
    ) : (
      <View style={styles.marketEmptyPanel}>
        <Text style={styles.marketEmptyTitle}>
          {favoritesOnly
            ? t("market.emptyFavoritesTitle")
            : t("players.emptyTitle")}
        </Text>
        <Text style={styles.mutedText}>
          {favoritesOnly
            ? t("market.emptyFavoritesDescription")
            : t("players.emptyDescription")}
        </Text>
      </View>
    );

  return (
    <View style={styles.marketScreenRoot}>
      <FlashList
        contentContainerStyle={[styles.fantasyScreen, styles.marketListContent]}
        data={filteredPlayers}
        drawDistance={FANTASY_PLAYER_LIST_ITEM_HEIGHT * 7}
        extraData={favoriteIdSet}
        getItemType={(player) => player.position}
        ItemSeparatorComponent={FantasyPlayerListSeparator}
        keyboardShouldPersistTaps="always"
        keyExtractor={(player) => player.id}
        ListEmptyComponent={emptyState}
        ListHeaderComponent={listHeader}
        ListHeaderComponentStyle={styles.marketListHeaderWrap}
        maintainVisibleContentPosition={{ disabled: true }}
        renderItem={renderMarketPlayer}
      />

      {!isDesktopWeb ? (
        <BottomSheet
          contentScrollEnabled={false}
          onClose={() => setClubPickerOpen(false)}
          visible={isClubPickerOpen}
        >
          <View style={styles.seasonPickerSheetContent}>
            <ScrollView
              style={styles.seasonPickerScroll}
              contentContainerStyle={styles.seasonPickerOptions}
            >
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  setSelectedClubId(null);
                  setClubPickerOpen(false);
                }}
                style={[
                  styles.seasonPickerOption,
                  selectedClubId === null
                    ? styles.seasonPickerOptionSelected
                    : null,
                ]}
              >
                <View style={styles.seasonPickerOptionBody}>
                  <View style={styles.seasonPickerOptionTextGroup}>
                    <Text
                      numberOfLines={1}
                      style={styles.seasonPickerOptionText}
                    >
                      {t("market.allTeams")}
                    </Text>
                  </View>
                </View>
                <View
                  style={[
                    styles.seasonPickerOptionRadio,
                    selectedClubId === null
                      ? styles.seasonPickerOptionRadioSelected
                      : null,
                  ]}
                >
                  {selectedClubId === null ? (
                    <View style={styles.seasonPickerOptionRadioDot} />
                  ) : null}
                </View>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  setSelectedClubId(MARKET_FREE_AGENTS_VALUE);
                  setClubPickerOpen(false);
                }}
                style={[
                  styles.seasonPickerOption,
                  selectedClubIsFreeAgents
                    ? styles.seasonPickerOptionSelected
                    : null,
                ]}
              >
                <View style={styles.seasonPickerOptionBody}>
                  <View style={styles.seasonPickerOptionTextGroup}>
                    <Text
                      numberOfLines={1}
                      style={styles.seasonPickerOptionText}
                    >
                      {t("players.freeAgents")}
                    </Text>
                  </View>
                </View>
                <View
                  style={[
                    styles.seasonPickerOptionRadio,
                    selectedClubIsFreeAgents
                      ? styles.seasonPickerOptionRadioSelected
                      : null,
                  ]}
                >
                  {selectedClubIsFreeAgents ? (
                    <View style={styles.seasonPickerOptionRadioDot} />
                  ) : null}
                </View>
              </Pressable>

              {activeClubs.map((club) => {
                const isSelected = club.id === selectedClubId;
                return (
                  <Pressable
                    accessibilityRole="button"
                    key={club.id}
                    onPress={() => {
                      setSelectedClubId(club.id);
                      setClubPickerOpen(false);
                    }}
                    style={[
                      styles.seasonPickerOption,
                      isSelected ? styles.seasonPickerOptionSelected : null,
                    ]}
                  >
                    <View style={styles.seasonPickerOptionBody}>
                      <FantasyClubLogo club={club} />
                      <View style={styles.seasonPickerOptionTextGroup}>
                        <Text
                          numberOfLines={1}
                          style={styles.seasonPickerOptionText}
                        >
                          {club.name}
                        </Text>
                      </View>
                    </View>
                    {isSelected ? (
                      <Check
                        color={colors.brand.blue}
                        size={22}
                        strokeWidth={2.8}
                      />
                    ) : (
                      <View style={styles.seasonPickerOptionRadio} />
                    )}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </BottomSheet>
      ) : null}

      <PlayerDetailSheet
        isFavorite={selectedPlayerIsFavorite}
        mode="market"
        onClose={() => setSelectedPlayer(null)}
        onToggleFavorite={
          selectedPlayer
            ? () =>
                onToggleFavorite(selectedPlayer.id, !selectedPlayerIsFavorite)
            : undefined
        }
        player={selectedPlayer}
        visible={Boolean(selectedPlayer)}
      />
    </View>
  );
}
