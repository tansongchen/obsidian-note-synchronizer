import Note from "src/note";
import Formatter from "../src/format";

const markdownMode = new Formatter('卡片盒', { headingLevel: 1, render: false, linkify: true, highlightAsCloze: false });

test('Render back link', () => {
  expect(markdownMode.convertWikilink('[[笔记]]')).toBe(
    '[笔记](obsidian://open?vault=%E5%8D%A1%E7%89%87%E7%9B%92&file=%E7%AC%94%E8%AE%B0)'
  )
})

test('e2e', () => {
  const fields = {'正面': '笔记', '背面': '[[另一条笔记]]'};
  const result = markdownMode.format(new Note('', '', '', { nid: 0, mid: 0, tags: [] }, fields));
  expect(result['正面']).toBe(
    '[笔记](obsidian://open?vault=%E5%8D%A1%E7%89%87%E7%9B%92&file=%E7%AC%94%E8%AE%B0)'
  );
  expect(result['背面']).toBe(
    '[另一条笔记](obsidian://open?vault=%E5%8D%A1%E7%89%87%E7%9B%92&file=%E5%8F%A6%E4%B8%80%E6%9D%A1%E7%AC%94%E8%AE%B0)'
  );
})
