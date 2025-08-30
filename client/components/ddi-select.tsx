import { useState, useMemo } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

interface Country {
  code: string;
  name: string;
  ddi: string;
  flag: string;
}

const countries: Country[] = [
  // Most common countries first
  { code: "BR", name: "Brasil", ddi: "+55", flag: "🇧🇷" },
  { code: "US", name: "Estados Unidos", ddi: "+1", flag: "🇺🇸" },
  { code: "CA", name: "Canadá", ddi: "+1", flag: "🇨🇦" },
  { code: "AR", name: "Argentina", ddi: "+54", flag: "🇦🇷" },
  { code: "CL", name: "Chile", ddi: "+56", flag: "🇨🇱" },
  { code: "CO", name: "Colômbia", ddi: "+57", flag: "🇨🇴" },
  { code: "PE", name: "Peru", ddi: "+51", flag: "🇵🇪" },
  { code: "UY", name: "Uruguai", ddi: "+598", flag: "🇺🇾" },
  { code: "PY", name: "Paraguai", ddi: "+595", flag: "🇵🇾" },
  { code: "BO", name: "Bolívia", ddi: "+591", flag: "🇧🇴" },
  { code: "EC", name: "Equador", ddi: "+593", flag: "🇪🇨" },
  { code: "VE", name: "Venezuela", ddi: "+58", flag: "🇻🇪" },
  { code: "MX", name: "México", ddi: "+52", flag: "🇲🇽" },
  { code: "PT", name: "Portugal", ddi: "+351", flag: "🇵🇹" },
  { code: "ES", name: "Espanha", ddi: "+34", flag: "🇪🇸" },
  { code: "FR", name: "França", ddi: "+33", flag: "🇫🇷" },
  { code: "IT", name: "Itália", ddi: "+39", flag: "🇮🇹" },
  { code: "DE", name: "Alemanha", ddi: "+49", flag: "🇩🇪" },
  { code: "GB", name: "Reino Unido", ddi: "+44", flag: "🇬🇧" },
  { code: "JP", name: "Japão", ddi: "+81", flag: "🇯🇵" },
  { code: "CN", name: "China", ddi: "+86", flag: "🇨🇳" },
  { code: "IN", name: "Índia", ddi: "+91", flag: "🇮🇳" },
  { code: "AU", name: "Austrália", ddi: "+61", flag: "🇦🇺" },
  { code: "NZ", name: "Nova Zelândia", ddi: "+64", flag: "🇳🇿" },
  { code: "ZA", name: "África do Sul", ddi: "+27", flag: "🇿🇦" },

  // More countries alphabetically
  { code: "AF", name: "Afeganistão", ddi: "+93", flag: "🇦🇫" },
  { code: "AL", name: "Albânia", ddi: "+355", flag: "🇦🇱" },
  { code: "DZ", name: "Argélia", ddi: "+213", flag: "🇩🇿" },
  { code: "AS", name: "Samoa Americana", ddi: "+1684", flag: "🇦🇸" },
  { code: "AD", name: "Andorra", ddi: "+376", flag: "🇦🇩" },
  { code: "AO", name: "Angola", ddi: "+244", flag: "🇦🇴" },
  { code: "AI", name: "Anguilla", ddi: "+1264", flag: "🇦🇮" },
  { code: "AG", name: "Antígua e Barbuda", ddi: "+1268", flag: "🇦🇬" },
  { code: "AM", name: "Armênia", ddi: "+374", flag: "🇦🇲" },
  { code: "AW", name: "Aruba", ddi: "+297", flag: "🇦🇼" },
  { code: "AT", name: "Áustria", ddi: "+43", flag: "🇦🇹" },
  { code: "AZ", name: "Azerbaijão", ddi: "+994", flag: "🇦🇿" },
  { code: "BS", name: "Bahamas", ddi: "+1242", flag: "🇧🇸" },
  { code: "BH", name: "Bahrein", ddi: "+973", flag: "🇧🇭" },
  { code: "BD", name: "Bangladesh", ddi: "+880", flag: "🇧🇩" },
  { code: "BB", name: "Barbados", ddi: "+1246", flag: "🇧🇧" },
  { code: "BY", name: "Bielorrússia", ddi: "+375", flag: "🇧🇾" },
  { code: "BE", name: "Bélgica", ddi: "+32", flag: "🇧🇪" },
  { code: "BZ", name: "Belize", ddi: "+501", flag: "🇧🇿" },
  { code: "BJ", name: "Benin", ddi: "+229", flag: "🇧🇯" },
  { code: "BM", name: "Bermuda", ddi: "+1441", flag: "🇧🇲" },
  { code: "BT", name: "Butão", ddi: "+975", flag: "🇧🇹" },
  { code: "BA", name: "Bósnia e Herzegovina", ddi: "+387", flag: "🇧🇦" },
  { code: "BW", name: "Botsuana", ddi: "+267", flag: "🇧🇼" },
  { code: "BN", name: "Brunei", ddi: "+673", flag: "🇧🇳" },
  { code: "BG", name: "Bulgária", ddi: "+359", flag: "🇧🇬" },
  { code: "BF", name: "Burkina Faso", ddi: "+226", flag: "🇧🇫" },
  { code: "BI", name: "Burundi", ddi: "+257", flag: "🇧🇮" },
  { code: "KH", name: "Camboja", ddi: "+855", flag: "🇰🇭" },
  { code: "CM", name: "Camarões", ddi: "+237", flag: "🇨🇲" },
  { code: "CV", name: "Cabo Verde", ddi: "+238", flag: "🇨🇻" },
  { code: "KY", name: "Ilhas Cayman", ddi: "+1345", flag: "🇰🇾" },
  { code: "CF", name: "República Centro-Africana", ddi: "+236", flag: "🇨🇫" },
  { code: "TD", name: "Chade", ddi: "+235", flag: "🇹🇩" },
  { code: "CX", name: "Ilha Christmas", ddi: "+61", flag: "🇨🇽" },
  { code: "CC", name: "Ilhas Cocos", ddi: "+61", flag: "🇨🇨" },
  { code: "KM", name: "Comores", ddi: "+269", flag: "🇰🇲" },
  { code: "CG", name: "Congo", ddi: "+242", flag: "🇨🇬" },
  { code: "CD", name: "Congo (RDC)", ddi: "+243", flag: "🇨🇩" },
  { code: "CK", name: "Ilhas Cook", ddi: "+682", flag: "🇨🇰" },
  { code: "CR", name: "Costa Rica", ddi: "+506", flag: "🇨🇷" },
  { code: "CI", name: "Costa do Marfim", ddi: "+225", flag: "🇨🇮" },
  { code: "HR", name: "Croácia", ddi: "+385", flag: "🇭🇷" },
  { code: "CU", name: "Cuba", ddi: "+53", flag: "🇨🇺" },
  { code: "CW", name: "Curaçao", ddi: "+599", flag: "🇨🇼" },
  { code: "CY", name: "Chipre", ddi: "+357", flag: "🇨🇾" },
  { code: "CZ", name: "República Tcheca", ddi: "+420", flag: "🇨🇿" },
  { code: "DK", name: "Dinamarca", ddi: "+45", flag: "🇩🇰" },
  { code: "DJ", name: "Djibuti", ddi: "+253", flag: "🇩🇯" },
  { code: "DM", name: "Dominica", ddi: "+1767", flag: "🇩🇲" },
  { code: "DO", name: "República Dominicana", ddi: "+1", flag: "🇩🇴" },
  { code: "EG", name: "Egito", ddi: "+20", flag: "🇪🇬" },
  { code: "SV", name: "El Salvador", ddi: "+503", flag: "🇸🇻" },
  { code: "GQ", name: "Guiné Equatorial", ddi: "+240", flag: "🇬🇶" },
  { code: "ER", name: "Eritreia", ddi: "+291", flag: "🇪🇷" },
  { code: "EE", name: "Estônia", ddi: "+372", flag: "🇪🇪" },
  { code: "ET", name: "Etiópia", ddi: "+251", flag: "🇪🇹" },
  { code: "FK", name: "Ilhas Malvinas", ddi: "+500", flag: "🇫🇰" },
  { code: "FO", name: "Ilhas Faroé", ddi: "+298", flag: "🇫🇴" },
  { code: "FJ", name: "Fiji", ddi: "+679", flag: "🇫🇯" },
  { code: "FI", name: "Finlândia", ddi: "+358", flag: "🇫🇮" },
  { code: "GF", name: "Guiana Francesa", ddi: "+594", flag: "🇬🇫" },
  { code: "PF", name: "Polinésia Francesa", ddi: "+689", flag: "🇵🇫" },
  { code: "GA", name: "Gabão", ddi: "+241", flag: "🇬🇦" },
  { code: "GM", name: "Gâmbia", ddi: "+220", flag: "🇬🇲" },
  { code: "GE", name: "Geórgia", ddi: "+995", flag: "🇬🇪" },
  { code: "GH", name: "Gana", ddi: "+233", flag: "🇬🇭" },
  { code: "GI", name: "Gibraltar", ddi: "+350", flag: "🇬🇮" },
  { code: "GR", name: "Grécia", ddi: "+30", flag: "🇬🇷" },
  { code: "GL", name: "Groenlândia", ddi: "+299", flag: "🇬🇱" },
  { code: "GD", name: "Granada", ddi: "+1473", flag: "🇬🇩" },
  { code: "GP", name: "Guadalupe", ddi: "+590", flag: "🇬🇵" },
  { code: "GU", name: "Guam", ddi: "+1671", flag: "🇬🇺" },
  { code: "GT", name: "Guatemala", ddi: "+502", flag: "🇬🇹" },
  { code: "GG", name: "Guernsey", ddi: "+44", flag: "🇬🇬" },
  { code: "GN", name: "Guiné", ddi: "+224", flag: "🇬🇳" },
  { code: "GW", name: "Guiné-Bissau", ddi: "+245", flag: "🇬🇼" },
  { code: "GY", name: "Guiana", ddi: "+592", flag: "🇬🇾" },
  { code: "HT", name: "Haiti", ddi: "+509", flag: "🇭🇹" },
  { code: "HN", name: "Honduras", ddi: "+504", flag: "🇭🇳" },
  { code: "HK", name: "Hong Kong", ddi: "+852", flag: "🇭🇰" },
  { code: "HU", name: "Hungria", ddi: "+36", flag: "🇭🇺" },
  { code: "IS", name: "Islândia", ddi: "+354", flag: "🇮🇸" },
  { code: "ID", name: "Indonésia", ddi: "+62", flag: "🇮🇩" },
  { code: "IR", name: "Irã", ddi: "+98", flag: "🇮🇷" },
  { code: "IQ", name: "Iraque", ddi: "+964", flag: "🇮🇶" },
  { code: "IE", name: "Irlanda", ddi: "+353", flag: "🇮🇪" },
  { code: "IM", name: "Ilha de Man", ddi: "+44", flag: "🇮🇲" },
  { code: "IL", name: "Israel", ddi: "+972", flag: "🇮🇱" },
  { code: "JM", name: "Jamaica", ddi: "+1876", flag: "🇯🇲" },
  { code: "JE", name: "Jersey", ddi: "+44", flag: "🇯🇪" },
  { code: "JO", name: "Jordânia", ddi: "+962", flag: "🇯🇴" },
  { code: "KZ", name: "Cazaquistão", ddi: "+7", flag: "🇰🇿" },
  { code: "KE", name: "Quênia", ddi: "+254", flag: "🇰🇪" },
  { code: "KI", name: "Kiribati", ddi: "+686", flag: "🇰🇮" },
  { code: "KP", name: "Coreia do Norte", ddi: "+850", flag: "🇰🇵" },
  { code: "KR", name: "Coreia do Sul", ddi: "+82", flag: "🇰🇷" },
  { code: "KW", name: "Kuwait", ddi: "+965", flag: "🇰🇼" },
  { code: "KG", name: "Quirguistão", ddi: "+996", flag: "🇰🇬" },
  { code: "LA", name: "Laos", ddi: "+856", flag: "🇱🇦" },
  { code: "LV", name: "Letônia", ddi: "+371", flag: "🇱🇻" },
  { code: "LB", name: "Líbano", ddi: "+961", flag: "🇱🇧" },
  { code: "LS", name: "Lesoto", ddi: "+266", flag: "🇱🇸" },
  { code: "LR", name: "Libéria", ddi: "+231", flag: "🇱🇷" },
  { code: "LY", name: "Líbia", ddi: "+218", flag: "🇱🇾" },
  { code: "LI", name: "Liechtenstein", ddi: "+423", flag: "🇱🇮" },
  { code: "LT", name: "Lituânia", ddi: "+370", flag: "🇱🇹" },
  { code: "LU", name: "Luxemburgo", ddi: "+352", flag: "🇱🇺" },
  { code: "MO", name: "Macau", ddi: "+853", flag: "🇲🇴" },
  { code: "MK", name: "Macedônia do Norte", ddi: "+389", flag: "🇲🇰" },
  { code: "MG", name: "Madagascar", ddi: "+261", flag: "🇲🇬" },
  { code: "MW", name: "Malawi", ddi: "+265", flag: "🇲🇼" },
  { code: "MY", name: "Malásia", ddi: "+60", flag: "🇲🇾" },
  { code: "MV", name: "Maldivas", ddi: "+960", flag: "🇲🇻" },
  { code: "ML", name: "Mali", ddi: "+223", flag: "🇲🇱" },
  { code: "MT", name: "Malta", ddi: "+356", flag: "🇲🇹" },
  { code: "MH", name: "Ilhas Marshall", ddi: "+692", flag: "🇲🇭" },
  { code: "MQ", name: "Martinica", ddi: "+596", flag: "🇲🇶" },
  { code: "MR", name: "Mauritânia", ddi: "+222", flag: "🇲🇷" },
  { code: "MU", name: "Maurício", ddi: "+230", flag: "🇲🇺" },
  { code: "YT", name: "Mayotte", ddi: "+262", flag: "🇾🇹" },
  { code: "FM", name: "Micronésia", ddi: "+691", flag: "🇫🇲" },
  { code: "MD", name: "Moldova", ddi: "+373", flag: "🇲🇩" },
  { code: "MC", name: "Mônaco", ddi: "+377", flag: "🇲🇨" },
  { code: "MN", name: "Mongólia", ddi: "+976", flag: "🇲🇳" },
  { code: "ME", name: "Montenegro", ddi: "+382", flag: "🇲🇪" },
  { code: "MS", name: "Montserrat", ddi: "+1664", flag: "🇲🇸" },
  { code: "MA", name: "Marrocos", ddi: "+212", flag: "🇲🇦" },
  { code: "MZ", name: "Moçambique", ddi: "+258", flag: "🇲🇿" },
  { code: "MM", name: "Myanmar", ddi: "+95", flag: "🇲🇲" },
  { code: "NA", name: "Namíbia", ddi: "+264", flag: "🇳🇦" },
  { code: "NR", name: "Nauru", ddi: "+674", flag: "🇳🇷" },
  { code: "NP", name: "Nepal", ddi: "+977", flag: "🇳🇵" },
  { code: "NL", name: "Países Baixos", ddi: "+31", flag: "🇳🇱" },
  { code: "NC", name: "Nova Caledônia", ddi: "+687", flag: "🇳🇨" },
  { code: "NI", name: "Nicarágua", ddi: "+505", flag: "🇳🇮" },
  { code: "NE", name: "Níger", ddi: "+227", flag: "🇳🇪" },
  { code: "NG", name: "Nigéria", ddi: "+234", flag: "🇳🇬" },
  { code: "NU", name: "Niue", ddi: "+683", flag: "🇳🇺" },
  { code: "NF", name: "Ilha Norfolk", ddi: "+672", flag: "🇳🇫" },
  { code: "MP", name: "Ilhas Marianas do Norte", ddi: "+1670", flag: "🇲🇵" },
  { code: "NO", name: "Noruega", ddi: "+47", flag: "🇳🇴" },
  { code: "OM", name: "Omã", ddi: "+968", flag: "🇴🇲" },
  { code: "PK", name: "Paquistão", ddi: "+92", flag: "🇵🇰" },
  { code: "PW", name: "Palau", ddi: "+680", flag: "🇵🇼" },
  { code: "PS", name: "Palestina", ddi: "+970", flag: "🇵🇸" },
  { code: "PA", name: "Panamá", ddi: "+507", flag: "🇵🇦" },
  { code: "PG", name: "Papua Nova Guiné", ddi: "+675", flag: "🇵🇬" },
  { code: "PH", name: "Filipinas", ddi: "+63", flag: "🇵🇭" },
  { code: "PN", name: "Ilhas Pitcairn", ddi: "+64", flag: "🇵🇳" },
  { code: "PL", name: "Polônia", ddi: "+48", flag: "🇵🇱" },
  { code: "PR", name: "Porto Rico", ddi: "+1", flag: "🇵🇷" },
  { code: "QA", name: "Catar", ddi: "+974", flag: "🇶🇦" },
  { code: "RE", name: "Reunião", ddi: "+262", flag: "🇷🇪" },
  { code: "RO", name: "Romênia", ddi: "+40", flag: "🇷🇴" },
  { code: "RU", name: "Rússia", ddi: "+7", flag: "🇷🇺" },
  { code: "RW", name: "Ruanda", ddi: "+250", flag: "🇷🇼" },
  { code: "BL", name: "São Bartolomeu", ddi: "+590", flag: "🇧🇱" },
  { code: "SH", name: "Santa Helena", ddi: "+290", flag: "🇸🇭" },
  { code: "KN", name: "São Cristóvão e Nevis", ddi: "+1869", flag: "🇰🇳" },
  { code: "LC", name: "Santa Lúcia", ddi: "+1758", flag: "🇱🇨" },
  { code: "MF", name: "São Martinho", ddi: "+590", flag: "🇲🇫" },
  { code: "PM", name: "São Pedro e Miquelão", ddi: "+508", flag: "🇵🇲" },
  { code: "VC", name: "São Vicente e Granadinas", ddi: "+1784", flag: "🇻🇨" },
  { code: "WS", name: "Samoa", ddi: "+685", flag: "🇼🇸" },
  { code: "SM", name: "San Marino", ddi: "+378", flag: "🇸🇲" },
  { code: "ST", name: "São Tomé e Príncipe", ddi: "+239", flag: "🇸🇹" },
  { code: "SA", name: "Arábia Saudita", ddi: "+966", flag: "🇸🇦" },
  { code: "SN", name: "Senegal", ddi: "+221", flag: "🇸🇳" },
  { code: "RS", name: "Sérvia", ddi: "+381", flag: "🇷🇸" },
  { code: "SC", name: "Seychelles", ddi: "+248", flag: "🇸🇨" },
  { code: "SL", name: "Serra Leoa", ddi: "+232", flag: "🇸🇱" },
  { code: "SG", name: "Singapura", ddi: "+65", flag: "🇸🇬" },
  { code: "SX", name: "Sint Maarten", ddi: "+1721", flag: "🇸🇽" },
  { code: "SK", name: "Eslováquia", ddi: "+421", flag: "🇸🇰" },
  { code: "SI", name: "Eslovênia", ddi: "+386", flag: "🇸🇮" },
  { code: "SB", name: "Ilhas Salomão", ddi: "+677", flag: "🇸🇧" },
  { code: "SO", name: "Somália", ddi: "+252", flag: "🇸🇴" },
  { code: "GS", name: "Geórgia do Sul", ddi: "+500", flag: "🇬🇸" },
  { code: "SS", name: "Sudão do Sul", ddi: "+211", flag: "🇸🇸" },
  { code: "LK", name: "Sri Lanka", ddi: "+94", flag: "🇱🇰" },
  { code: "SD", name: "Sudão", ddi: "+249", flag: "🇸🇩" },
  { code: "SR", name: "Suriname", ddi: "+597", flag: "🇸🇷" },
  { code: "SJ", name: "Svalbard e Jan Mayen", ddi: "+47", flag: "🇸🇯" },
  { code: "SZ", name: "Eswatini", ddi: "+268", flag: "🇸🇿" },
  { code: "SE", name: "Suécia", ddi: "+46", flag: "🇸🇪" },
  { code: "CH", name: "Suíça", ddi: "+41", flag: "🇨🇭" },
  { code: "SY", name: "Síria", ddi: "+963", flag: "🇸🇾" },
  { code: "TW", name: "Taiwan", ddi: "+886", flag: "🇹🇼" },
  { code: "TJ", name: "Tajiquistão", ddi: "+992", flag: "🇹🇯" },
  { code: "TZ", name: "Tanzânia", ddi: "+255", flag: "🇹🇿" },
  { code: "TH", name: "Tailândia", ddi: "+66", flag: "🇹🇭" },
  { code: "TL", name: "Timor-Leste", ddi: "+670", flag: "🇹🇱" },
  { code: "TG", name: "Togo", ddi: "+228", flag: "🇹🇬" },
  { code: "TK", name: "Tokelau", ddi: "+690", flag: "🇹🇰" },
  { code: "TO", name: "Tonga", ddi: "+676", flag: "🇹🇴" },
  { code: "TT", name: "Trinidad e Tobago", ddi: "+1868", flag: "🇹🇹" },
  { code: "TN", name: "Tunísia", ddi: "+216", flag: "🇹🇳" },
  { code: "TR", name: "Turquia", ddi: "+90", flag: "🇹🇷" },
  { code: "TM", name: "Turcomenistão", ddi: "+993", flag: "🇹🇲" },
  { code: "TC", name: "Ilhas Turks e Caicos", ddi: "+1649", flag: "🇹🇨" },
  { code: "TV", name: "Tuvalu", ddi: "+688", flag: "🇹🇻" },
  { code: "UG", name: "Uganda", ddi: "+256", flag: "🇺🇬" },
  { code: "UA", name: "Ucrânia", ddi: "+380", flag: "🇺🇦" },
  { code: "AE", name: "Emirados Árabes Unidos", ddi: "+971", flag: "🇦🇪" },
  { code: "UZ", name: "Uzbequistão", ddi: "+998", flag: "🇺🇿" },
  { code: "VU", name: "Vanuatu", ddi: "+678", flag: "🇻🇺" },
  { code: "VA", name: "Vaticano", ddi: "+39", flag: "🇻🇦" },
  { code: "VN", name: "Vietnã", ddi: "+84", flag: "🇻🇳" },
  { code: "VG", name: "Ilhas Virgens Britânicas", ddi: "+1284", flag: "🇻🇬" },
  { code: "VI", name: "Ilhas Virgens Americanas", ddi: "+1340", flag: "🇻🇮" },
  { code: "WF", name: "Wallis e Futuna", ddi: "+681", flag: "🇼🇫" },
  { code: "EH", name: "Saara Ocidental", ddi: "+212", flag: "🇪🇭" },
  { code: "YE", name: "Iêmen", ddi: "+967", flag: "🇾🇪" },
  { code: "ZM", name: "Zâmbia", ddi: "+260", flag: "🇿🇲" },
  { code: "ZW", name: "Zimbábue", ddi: "+263", flag: "🇿🇼" },
];

interface DDISelectProps {
  value?: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
}

export function DDISelect({
  value = "+55",
  onChange,
  disabled = false,
  className = "",
}: DDISelectProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const filteredCountries = useMemo(() => {
    if (!searchTerm) return countries;

    const lowerSearch = searchTerm.toLowerCase();
    return countries.filter(
      (country) =>
        country.name.toLowerCase().includes(lowerSearch) ||
        country.ddi.includes(lowerSearch) ||
        country.code.toLowerCase().includes(lowerSearch),
    );
  }, [searchTerm]);

  // Deduplicate by DDI so each SelectItem has a unique value
  const uniqueByDdi = useMemo(() => {
    const map = new Map<string, Country>();
    for (const c of filteredCountries) {
      if (!map.has(c.ddi)) map.set(c.ddi, c);
    }
    return Array.from(map.values());
  }, [filteredCountries]);

  const selectedCountry =
    countries.find((country) => country.ddi === value) || countries[0];

  return (
    <Select
      value={value}
      onValueChange={onChange}
      disabled={disabled}
      open={isOpen}
      onOpenChange={setIsOpen}
    >
      <SelectTrigger className={`w-[120px] ${className}`}>
        <SelectValue>
          <div className="flex items-center gap-2">
            <span className="text-base">{selectedCountry.flag}</span>
            <span className="text-sm font-medium">{selectedCountry.ddi}</span>
          </div>
        </SelectValue>
      </SelectTrigger>

      <SelectContent className="w-[300px]">
        <div className="p-2 border-b">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar por país ou código..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>

        <div className="max-h-60 overflow-y-auto">
          {uniqueByDdi.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              Nenhum país encontrado
            </div>
          ) : (
            uniqueByDdi.map((country) => (
              <SelectItem
                key={country.ddi}
                value={country.ddi}
                className="cursor-pointer"
              >
                <div className="flex items-center gap-3 w-full">
                  <span className="text-lg">{country.flag}</span>
                  <div className="flex-1 text-left">
                    <div className="font-medium">{country.name}</div>
                    <div className="text-sm text-gray-500">{country.ddi}</div>
                  </div>
                </div>
              </SelectItem>
            ))
          )}
        </div>
      </SelectContent>
    </Select>
  );
}
