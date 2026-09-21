import { FlashList } from "@shopify/flash-list";
import { Star } from "lucide-react-native";
import { useCallback, useDeferredValue, useMemo, useState } from "react";
import {
  Keyboard,
  Platform,
  Pressable,
  Text,
  useWindowDimensions,
  View,
} from "react-native";

import type { Id } from "../../../../convex/_generated/dataModel";
import { ClearableTextInput } from "../../../components/common/ClearableTextInput";
import { LoadingBlock } from "../../../components/common/LoadingBlock";
import { WEB_DESKTOP_MIN_WIDTH } from "../../../constants";
import { useI18n } from "../../../i18n/I18nProvider";
import { useDismissKeyboardOnChange } from "../../../hooks/useDismissKeyboardOnChange";
import type { TranslationKey } from "../../../i18n/translations";
import { styles } from "../../../styles";
import { colors } from "../../../theme/tokens";
import { FilterSelectButton, FilterSelectMenu } from "../components/FilterSelect";
import { FilterResetButton } from "../components/FilterResetButton";
import {
  DesktopSelect,
  type DesktopSelectOption,
} from "../components/DesktopSelect";
import {
  FANTASY_PLAYER_LIST_ITEM_HEIGHT,
  FantasyClubLogo,
  FantasyPlayerListRow,
  FantasyPlayerListSeparator,
} from "../components/FantasyPlayerListRow";
import { PlayerDetailSheet } from "../components/PlayerDetailSheet";
import { PlayerDetailScreen } from "../components/PlayerDetailScreen";
import { normalizeFantasySearchValue } from "../utils/localizedFantasyData";
import { formatFantasyMoney } from "../utils/money";
import { useFantasySeasonTheme } from "../utils/seasonThemeContext";

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
  cleanSheets: number;
  form: number;
  goals: number;
  goalsConceded: number;
  lastGameweekPoints: number;
  ownGoals: number;
  penaltiesMissed: number;
  penaltiesSaved: number;
  position: PlayerPosition;
  price: number;
  previousPrice: number | null;
  priceChangedAt: number | null;
  priceDelta: number;
  redCards: number;
  saves: number;
  seasonPoints: number;
  selectedByTeams: number;
  selectedPercent: number;
  status: PlayerStatus;
  statusDetails?: {
    message?: string | null;
    messageEn?: string | null;
    messagePl?: string | null;
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
type MarketClubFilterValue = Id<"fantasyClubs"> | null;
type MarketPositionFilter = "all" | PlayerPosition;
type MarketSort = "price_desc" | "price_asc" | "points_desc" | "points_asc";
type MarketFilter = {
  id: "club" | "position" | "sort";
  label: string;
  mobileLabel: string;
  isActive: boolean;
  onValueChange: (value: string) => void;
  options: DesktopSelectOption[];
  value: string;
};

const MARKET_SORT_OPTIONS: { value: MarketSort; labelKey: TranslationKey }[] = [
  { value: "price_desc", labelKey: "team.playerPicker.sortPriceHigh" },
  { value: "price_asc", labelKey: "team.playerPicker.sortPriceLow" },
  { value: "points_desc", labelKey: "market.sortPointsHigh" },
  { value: "points_asc", labelKey: "market.sortPointsLow" },
];

const POSITION_LABEL_KEYS: Record<PlayerPosition, TranslationKey> = {
  goalkeeper: "players.position.goalkeeper",
  universal: "players.position.universal",
};

function normalizeSearchValue(value: string | null | undefined) {
  return normalizeFantasySearchValue(value);
}

export function MarketScreen({
  clubs,
  favoritePlayerIds,
  onToggleFavorite,
  players,
}: MarketScreenProps) {
  const { t } = useI18n();
  const fantasyTheme = useFantasySeasonTheme();
  const { width: windowWidth } = useWindowDimensions();
  const isDesktopWeb =
    Platform.OS === "web" && windowWidth >= WEB_DESKTOP_MIN_WIDTH;
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [openFilter, setOpenFilter] = useState<MarketFilter["id"] | null>(null);
  const [selectedClubId, setSelectedClubId] =
    useState<MarketClubFilterValue>(null);
  const [positionFilter, setPositionFilter] = useState<MarketPositionFilter>("all");
  const [sort, setSort] = useState<MarketSort>("price_desc");
  const [selectedPlayer, setSelectedPlayer] = useState<FantasyPlayer | null>(
    null,
  );
  const [searchQuery, setSearchQuery] = useState("");
  const filtersDirty =
    searchQuery !== "" || favoritesOnly || selectedClubId !== null ||
    positionFilter !== "all" || sort !== "price_desc";
  const resetFilters = useCallback(() => {
    Keyboard.dismiss();
    setSearchQuery("");
    setFavoritesOnly(false);
    setSelectedClubId(null);
    setPositionFilter("all");
    setSort("price_desc");
    setOpenFilter(null);
  }, []);
  const normalizedSearchQuery = normalizeSearchValue(searchQuery);
  const deferredFavoritesOnly = useDeferredValue(favoritesOnly);
  const deferredSelectedClubId = useDeferredValue(selectedClubId);
  const deferredPositionFilter = useDeferredValue(positionFilter);
  const deferredSort = useDeferredValue(sort);
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
  const selectedClub = useMemo(
    () => (selectedClubId ? (clubsById.get(selectedClubId) ?? null) : null),
    [clubsById, selectedClubId],
  );

  const sortedPlayers = useMemo(
    () =>
      [...(players ?? [])]
        .filter((player) => player.clubId !== null && player.status !== "left")
        .sort((a, b) => {
          const difference =
            deferredSort === "price_asc"
              ? a.price - b.price
              : deferredSort === "points_desc"
                ? b.seasonPoints - a.seasonPoints
                : deferredSort === "points_asc"
                  ? a.seasonPoints - b.seasonPoints
                  : b.price - a.price;
          return difference || a.displayName.localeCompare(b.displayName);
        }),
    [deferredSort, players],
  );

  const filteredPlayers = useMemo(() => {
    return sortedPlayers
      .filter(
        (player) => !deferredFavoritesOnly || favoriteIdSet.has(player.id),
      )
      .filter(
        (player) =>
          !deferredSelectedClubId || player.clubId === deferredSelectedClubId,
      )
      .filter(
        (player) =>
          deferredPositionFilter === "all" ||
          player.position === deferredPositionFilter,
      )
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
    deferredPositionFilter,
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
  const teamFilterLabel = selectedClub
    ? (selectedClub.shortName ?? selectedClub.name)
    : t("market.teamFilter");
  const clubFilterOptions = useMemo(
    () => [
      { label: t("market.allTeams"), value: MARKET_ALL_CLUBS_VALUE },
      ...activeClubs.map((club) => ({
        label: club.shortName ?? club.name,
        menuLabel: club.name,
        leading: <FantasyClubLogo club={club} size="sm" />,
        value: club.id,
      })),
    ],
    [activeClubs, t],
  );
  const filterControls = useMemo<MarketFilter[]>(() => {
    const positionOptions = [
      { label: t("team.playerPicker.allPositions"), value: "all" },
      { label: t(POSITION_LABEL_KEYS.goalkeeper), value: "goalkeeper" },
      { label: t(POSITION_LABEL_KEYS.universal), value: "universal" },
    ];
    const sortOptions = MARKET_SORT_OPTIONS.map((option) => ({
      label: t(option.labelKey),
      value: option.value,
    }));
    return [
      {
        id: "club",
        label: t("market.teamFilter"),
        mobileLabel: teamFilterLabel,
        isActive: selectedClubId !== null,
        onValueChange: (value) =>
          setSelectedClubId(
            value === MARKET_ALL_CLUBS_VALUE
              ? null
              : (value as Id<"fantasyClubs">),
          ),
        options: clubFilterOptions,
        value: selectedClubId ?? MARKET_ALL_CLUBS_VALUE,
      },
      {
        id: "position",
        label: t("team.playerPicker.positionFilter"),
        mobileLabel: positionFilter === "all"
          ? t("team.playerPicker.allPositions")
          : t(POSITION_LABEL_KEYS[positionFilter]),
        isActive: positionFilter !== "all",
        onValueChange: (value) => setPositionFilter(value as MarketPositionFilter),
        options: positionOptions,
        value: positionFilter,
      },
      {
        id: "sort",
        label: t("team.playerPicker.sortFilter"),
        mobileLabel: sortOptions.find((option) => option.value === sort)?.label
          ?? t("team.playerPicker.sortFilter"),
        isActive: sort !== "price_desc",
        onValueChange: (value) => setSort(value as MarketSort),
        options: sortOptions,
        value: sort,
      },
    ];
  }, [clubFilterOptions, positionFilter, selectedClubId, sort, t, teamFilterLabel]);
  const activeFilter = filterControls.find((filter) => filter.id === openFilter);
  const renderFilterControl = useCallback(
    (filter: MarketFilter) => isDesktopWeb ? (
      <DesktopSelect
        accessibilityLabel={filter.label}
        active={filter.isActive}
        key={filter.id}
        onValueChange={filter.onValueChange}
        options={filter.options}
        style={filter.id === "club" ? styles.marketTeamSelectDesktop : styles.marketOptionSelectDesktop}
        value={filter.value}
      />
    ) : (
      <FilterSelectButton
        accessibilityLabel={filter.label}
        active={filter.isActive}
        expanded={openFilter === filter.id}
        key={filter.id}
        label={filter.mobileLabel}
        onPress={() => {
          Keyboard.dismiss();
          setOpenFilter(current => current === filter.id ? null : filter.id);
        }}
        style={filter.id === "club" ? styles.marketFilterButton : styles.filterControlFlexible}
      />
    ),
    [isDesktopWeb, openFilter],
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
              favoritesOnly
                ? [
                    styles.marketFilterButtonActive,
                    {
                      backgroundColor: fantasyTheme.primaryColor,
                      borderColor: fantasyTheme.primaryColor,
                    },
                  ]
                : null,
            ]}
          >
            <Star
              color={
                favoritesOnly ? colors.text.inverse : fantasyTheme.primaryColor
              }
              fill={favoritesOnly ? colors.brand.yellow : "transparent"}
              size={18}
              strokeWidth={2.4}
            />
            <Text
              style={[
                favoritesOnly ? styles.marketFilterTextActive : styles.marketFilterText,
                !favoritesOnly && { color: fantasyTheme.primaryColor },
              ]}
            >
              {t("market.favoriteFilter")}
            </Text>
          </Pressable>

          {filterControls
            .filter((filter) => isDesktopWeb || filter.id === "club")
            .map(renderFilterControl)}
          {isDesktopWeb ? (
            <FilterResetButton disabled={!filtersDirty} onPress={resetFilters} />
          ) : (
            <View style={styles.marketFilterSecondaryRow}>
              {filterControls
                .filter((filter) => filter.id !== "club")
                .map(renderFilterControl)}
              <FilterResetButton
                compact
                disabled={!filtersDirty}
                onPress={resetFilters}
              />
            </View>
          )}
        </View>
        {!isDesktopWeb && activeFilter ? (
          <FilterSelectMenu
            accessibilityLabel={activeFilter.label}
            onClose={() => setOpenFilter(null)}
            onValueChange={activeFilter.onValueChange}
            options={activeFilter.options}
            value={activeFilter.value}
          />
        ) : null}
      </View>
    ),
    [
      activeFilter,
      filterControls,
      favoritesOnly,
      fantasyTheme.borderColor,
      fantasyTheme.primaryColor,
      fantasyTheme.softColor,
      handleToggleFavoritesOnly,
      filtersDirty,
      resetFilters,
      renderFilterControl,
      isDesktopWeb,
      searchQuery,
      t,
    ],
  );

  const emptyState =
    players === undefined ? (
      <View style={styles.marketEmptyPanel}>
        <LoadingBlock />
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
    <PlayerDetailScreen
      pageVisible={isDesktopWeb && Boolean(selectedPlayer)}
      details={
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
          presentation={isDesktopWeb ? "page" : "sheet"}
          player={selectedPlayer}
          visible={Boolean(selectedPlayer)}
        />
      }
    >
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
      </View>
    </PlayerDetailScreen>
  );
}
