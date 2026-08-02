export const DEADLOCK_ASSETS_API = "https://api.deadlock-api.com/v1/assets";

export const DEADLOCK_LANG_FRENCH = "french" as const;
export const DEADLOCK_LANG_ENGLISH = "english" as const;

export type DeadlockLanguage =
  | typeof DEADLOCK_LANG_FRENCH
  | typeof DEADLOCK_LANG_ENGLISH;

export type DeadlockItemType = "upgrade" | "ability" | "weapon";

export type DeadlockItemSlotType = "weapon" | "vitality" | "spirit";

export interface DeadlockHeroDescription {
  lore?: string;
  role?: string;
  playstyle?: string;
}

export interface DeadlockHeroImages {
  icon_hero_card?: string;
  icon_hero_card_webp?: string;
  icon_image_small?: string;
  icon_image_small_webp?: string;
  minimap_image?: string;
  minimap_image_webp?: string;
  top_bar_vertical_image?: string;
  top_bar_vertical_image_webp?: string;
  background_image?: string;
  background_image_webp?: string;
  name_image?: string;
}

export interface DeadlockHero {
  id: number;
  class_name: string;
  name: string;
  description: DeadlockHeroDescription;
  player_selectable: boolean;
  disabled: boolean;
  in_development: boolean;
  hero_type?: string;
  complexity?: number;
  tags?: string[];
  gun_tag?: string;
  images: DeadlockHeroImages;
  items?: Record<string, string>;
}

export interface DeadlockItemDescription {
  desc?: string;
}

export interface DeadlockItem {
  id: number;
  class_name: string;
  name: string;
  type: DeadlockItemType;
  image?: string;
  image_webp?: string;
  shop_image?: string;
  shop_image_webp?: string;
  heroes: number[];
  cost?: number;
  item_tier?: number;
  item_slot_type?: DeadlockItemSlotType | null;
  shopable?: boolean;
  description?: DeadlockItemDescription;
}

export type DeadlockReferenceKind = "hero" | "item" | "ability";

/** Entrée légère pour faire correspondre un nom dans un patch note. */
export interface DeadlockReference {
  kind: DeadlockReferenceKind;
  id: number;
  className: string;
  name: string;
  image?: string;
  role?: string;
  cost?: number;
  itemTier?: number;
  itemSlotType?: DeadlockItemSlotType | null;
  /** Héros associé (capacités) pour construire l'URL de détail. */
  heroId?: number;
  /** Page externe deadlock.io (nouvel onglet). */
  url?: string;
  /** Variantes de nom (ex. nom anglais pour matcher les patch notes VF). */
  aliases?: string[];
}

export interface DeadlockReferenceIndex {
  references: DeadlockReference[];
  byNormalizedName: ReadonlyMap<string, DeadlockReference>;
}
