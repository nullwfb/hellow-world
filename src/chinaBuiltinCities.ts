import type { GeoItem } from './weatherApi'

/** WGS-84 近似坐标；直辖市/省会/港澳/深圳等常用检索，零网络、避免 Open-Meteo 同名小地名干扰 */
type Entry = { name: string; admin1: string; lat: number; lon: number; country: string }

const BUILTIN: Record<string, Entry> = {
  北京: { name: '北京市', admin1: '北京', lat: 39.9042, lon: 116.4074, country: '中国' },
  北京市: { name: '北京市', admin1: '北京', lat: 39.9042, lon: 116.4074, country: '中国' },
  上海: { name: '上海市', admin1: '上海', lat: 31.2304, lon: 121.4737, country: '中国' },
  上海市: { name: '上海市', admin1: '上海', lat: 31.2304, lon: 121.4737, country: '中国' },
  天津: { name: '天津市', admin1: '天津', lat: 39.3434, lon: 117.202, country: '中国' },
  天津市: { name: '天津市', admin1: '天津', lat: 39.3434, lon: 117.202, country: '中国' },
  重庆: { name: '重庆市', admin1: '重庆', lat: 29.5628, lon: 106.5528, country: '中国' },
  重庆市: { name: '重庆市', admin1: '重庆', lat: 29.5628, lon: 106.5528, country: '中国' },
  香港: { name: '香港', admin1: '香港', lat: 22.282, lon: 114.158, country: '中国' },
  澳门: { name: '澳门', admin1: '澳门', lat: 22.1983, lon: 113.543, country: '中国' },
  石家庄: { name: '石家庄市', admin1: '河北', lat: 38.0428, lon: 114.515, country: '中国' },
  太原: { name: '太原市', admin1: '山西', lat: 37.8705, lon: 112.548, country: '中国' },
  沈阳: { name: '沈阳市', admin1: '辽宁', lat: 41.8057, lon: 123.432, country: '中国' },
  长春: { name: '长春市', admin1: '吉林', lat: 43.8868, lon: 125.324, country: '中国' },
  哈尔滨: { name: '哈尔滨市', admin1: '黑龙江', lat: 45.8023, lon: 126.535, country: '中国' },
  南京: { name: '南京市', admin1: '江苏', lat: 32.0603, lon: 118.796, country: '中国' },
  杭州: { name: '杭州市', admin1: '浙江', lat: 30.2741, lon: 120.155, country: '中国' },
  合肥: { name: '合肥市', admin1: '安徽', lat: 31.8206, lon: 117.227, country: '中国' },
  福州: { name: '福州市', admin1: '福建', lat: 26.0753, lon: 119.306, country: '中国' },
  南昌: { name: '南昌市', admin1: '江西', lat: 28.682, lon: 115.857, country: '中国' },
  济南: { name: '济南市', admin1: '山东', lat: 36.651, lon: 117.12, country: '中国' },
  郑州: { name: '郑州市', admin1: '河南', lat: 34.746, lon: 113.625, country: '中国' },
  武汉: { name: '武汉市', admin1: '湖北', lat: 30.592, lon: 114.305, country: '中国' },
  长沙: { name: '长沙市', admin1: '湖南', lat: 28.228, lon: 112.939, country: '中国' },
  广州: { name: '广州市', admin1: '广东', lat: 23.129, lon: 113.264, country: '中国' },
  深圳: { name: '深圳市', admin1: '广东', lat: 22.543, lon: 114.057, country: '中国' },
  南宁: { name: '南宁市', admin1: '广西', lat: 22.817, lon: 108.37, country: '中国' },
  海口: { name: '海口市', admin1: '海南', lat: 20.031, lon: 110.331, country: '中国' },
  成都: { name: '成都市', admin1: '四川', lat: 30.66, lon: 104.063, country: '中国' },
  贵阳: { name: '贵阳市', admin1: '贵州', lat: 26.647, lon: 106.63, country: '中国' },
  昆明: { name: '昆明市', admin1: '云南', lat: 25.038, lon: 102.71, country: '中国' },
  西安: { name: '西安市', admin1: '陕西', lat: 34.341, lon: 108.94, country: '中国' },
  兰州: { name: '兰州市', admin1: '甘肃', lat: 36.061, lon: 103.835, country: '中国' },
  西宁: { name: '西宁市', admin1: '青海', lat: 36.62, lon: 101.779, country: '中国' },
  台北: { name: '台北', admin1: '台湾', lat: 25.033, lon: 121.565, country: '中国' },
  臺北: { name: '台北', admin1: '台湾', lat: 25.033, lon: 121.565, country: '中国' },
  拉萨: { name: '拉萨市', admin1: '西藏', lat: 29.65, lon: 91.132, country: '中国' },
  呼和浩特: { name: '呼和浩特市', admin1: '内蒙古', lat: 40.842, lon: 111.748, country: '中国' },
  银川: { name: '银川市', admin1: '宁夏', lat: 38.49, lon: 106.232, country: '中国' },
  乌鲁木齐: { name: '乌鲁木齐市', admin1: '新疆', lat: 43.826, lon: 87.616, country: '中国' },
  香港特别行政区: { name: '香港', admin1: '香港', lat: 22.282, lon: 114.158, country: '中国' },
  澳门特别行政区: { name: '澳门', admin1: '澳门', lat: 22.1983, lon: 113.543, country: '中国' },
}

export function lookupChinaBuiltin(raw: string): GeoItem | null {
  const k = raw.trim()
  if (!k) return null
  if (BUILTIN[k]) {
    return toItem(BUILTIN[k]!)
  }
  const k2 = k.replace(/市$/, '')
  if (BUILTIN[k2]!) {
    return toItem(BUILTIN[k2]!)
  }
  return null
}

function toItem(e: Entry): GeoItem {
  return {
    name: e.name,
    admin1: e.admin1,
    country: e.country,
    latitude: e.lat,
    longitude: e.lon,
  }
}
