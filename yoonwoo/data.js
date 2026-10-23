// 所有日期、人物和事件均为虚构占位。修改这里即可更新内容。
window.TIMELINE_CONFIG = {
  cardSpacing: 0.16, // 卡片纵深间距，数值越小，前后卡片重叠越多。
  crossingDate: '2024.06.21',
  crossingAt: 0.46, // 交汇开始的位置，占整段滚动的比例。
  crossingDuration: 0.14,
  people: { a: 'A', b: 'B' },
  before: [
    { id: 'a1', person: 'a', date: '2023.03.12', title: '各自的出发', text: '一段故事，在还没有相遇的时候开始。', art: 'mountain', position: 1.5 },
    { id: 'b1', person: 'b', date: '2023.04.08', title: '另一座城市的春天', text: '同样的季节，另一种生活。', art: 'window', position: 4 },
    { id: 'a2', person: 'a', date: '2023.09.17', title: '留下一个瞬间', text: '一张旧照片，成为后来翻到的那一页。', art: 'moon', position: 8 },
    { id: 'b2', person: 'b', date: '2023.12.03', title: '写给未来的话', text: '那时还不知道，下一章会遇见谁。', art: 'mountain', position: 10.5 },
    { id: 'a3', person: 'a', date: '2024.03.02', title: '向同一个方向', text: '时间继续前进，交集正在靠近。', art: 'window', position: 15 },
    { id: 'b3', person: 'b', date: '2024.05.19', title: '相逢前的最后一页', text: '各自的轨迹，即将有共同的坐标。', art: 'moon', position: 17.5 }
  ],
  after: [
    { id: 'us1', person: 'both', date: '2024.06.21', title: '第一次，同一帧', text: '两条各自向前的线，在这一刻有了交点。', art: 'union', position: 3 },
    { id: 'us2', person: 'both', date: '2024.08.09', title: '故事开始有了回声', text: '一些普通片刻，被写进同一本时间簿。', art: 'window', position: 8 },
    { id: 'us3', person: 'both', date: '2024.11.04', title: '绕过四季，再次相见', text: '我们把再次并列的名字，放在这一页。', art: 'moon', position: 13 },
    { id: 'us4', person: 'both', date: '2025.02.14', title: '未完，待续', text: '时间仍在向前，留给下一次相逢。', art: 'union', position: 18 }
  ]
};
