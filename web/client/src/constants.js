import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

export const INTERACTION_CATEGORIES = [
  "Door (문)",
  "NPC (NPC)",
  "UI_Element (UI 요소)",
  "Button (버튼)",
  "Container (컨테이너)",
  "Lever (레버)",
  "Switch (스위치)",
  "Collectible (수집 아이템)",
  "QuestItem (퀘스트 아이템)",
  "Portal (포탈)",
  "Vehicle (탈것)",
  "Terminal (단말기)",
  "Weapon (무기)",
  "Trap (함정)",
  "PowerUp (파워업)",
  "PuzzlePiece (퍼즐 조각)",
  "Furniture (가구)",
  "EnvironmentObject (환경 오브젝트)",
  "AI_Companion (AI 동료)",
  "InGameStore (인게임 상점)",
  "InteractivePlatform (상호작용 플랫폼)"
];

export const INTERACTION_TYPES = [
  "open (열기)",
  "press (누르기)",
  "talk (대화)",
  "use (사용)",
  "grab (잡기)",
  "pick_up (집어 들기)",
  "drop (내려놓기)",
  "inspect (조사)",
  "rotate (회전)",
  "push (밀기)",
  "pull (당기기)",
  "throw (던지기)",
  "activate (활성화)",
  "deactivate (비활성화)",
  "climb (오르기)",
  "loot (약탈)",
  "equip (장비 착용)",
  "unequip (장비 해제)",
  "attack (공격)",
  "block (방어)",
  "combine (조합)",
  "craft (제작)",
  "build (건설)",
  "place (배치)",
  "consume (소비)",
  "ride (탑승)",
  "jump_on (점프해서 올라가기)"
];

// Custom tags management
export const loadCustomTags = async () => {
  try {
    const response = await axios.get(`${API_URL}/api/custom-tags`);
    return response.data;
  } catch (error) {
    console.error('Error loading custom tags:', error);
    return { categories: [], interaction_types: [] };
  }
};

export const saveCustomTag = async (type, tag) => {
  try {
    const response = await axios.post(`${API_URL}/api/custom-tags`, { type, tag });
    return response.data;
  } catch (error) {
    console.error('Error saving custom tag:', error);
    throw error;
  }
}; 