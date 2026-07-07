import {useState} from 'react';
import {TOOL_A_MISSIONS, TOOL_B_COMFORTS, TOOL_C_PHRASES} from '../lib/toolboxData';

export function Toolbox() {
  const [toolA, setToolA] = useState('');
  const [toolB, setToolB] = useState('');
  const [toolC, setToolC] = useState('');

  const pick = (list: string[]) => list[Math.floor(Math.random() * list.length)];

  const copyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      alert('已复制，去发给心爱的 TA 吧！');
    } catch {
      alert(`消息如下：\n${text}`);
    }
  };

  return (
    <section className="bg-white rounded-[2.25rem] p-6 shadow-lg border border-cream-200/40">
      <h2 className="text-xs font-bold tracking-widest text-charcoal-600 uppercase mb-4">
        🔧 异国恋工具箱
      </h2>
      <div className="flex flex-col gap-3">
        <ToolCard
          icon="🎬"
          containerClassName="bg-cyanic-50/70 border-cyanic-100"
          buttonClassName="bg-cyanic-500 hover:bg-cyanic-600 text-white"
          buttonLabel="点击抽取"
          title="远程约会随机任务"
          desc="今天我们要一起挑战做什么？"
          result={toolA}
          prefix="今日约会建议："
          onTrigger={() => setToolA(pick(TOOL_A_MISSIONS))}
        />
        <ToolCard
          icon="🫂"
          containerClassName="bg-love-50/50 border-love-100"
          buttonClassName="bg-love-500 hover:bg-love-600 text-white"
          buttonLabel="先不要吵"
          title="吵架冷静缓和器"
          desc="生气了吗？先按这里，抱一抱"
          result={toolB}
          prefix="温柔沟通："
          onTrigger={() => setToolB(pick(TOOL_B_COMFORTS))}
        />
        <ToolCard
          icon="💬"
          containerClassName="bg-cream-100/70 border-cream-200/60"
          buttonClassName="bg-cream-200 hover:bg-cream-300 text-cream-900"
          buttonLabel="帮我说一句"
          title="心动代发小信封"
          desc="想他，却不知道该怎么开口说"
          result={toolC}
          prefix="代发信："
          onTrigger={() => setToolC(pick(TOOL_C_PHRASES))}
          onCopy={toolC ? () => copyText(toolC) : undefined}
        />
      </div>
    </section>
  );
}

function ToolCard({
  icon,
  containerClassName,
  buttonClassName,
  buttonLabel,
  title,
  desc,
  result,
  prefix,
  onTrigger,
  onCopy,
}: {
  icon: string;
  containerClassName: string;
  buttonClassName: string;
  buttonLabel: string;
  title: string;
  desc: string;
  result: string;
  prefix: string;
  onTrigger: () => void;
  onCopy?: () => void;
}) {
  return (
    <div className={`border rounded-2xl p-4 transition-all ${containerClassName}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center text-lg shadow-xs">
            {icon}
          </div>
          <div>
            <h3 className="text-xs font-bold text-charcoal-800">{title}</h3>
            <p className="text-[0.65rem] text-charcoal-600 mt-0.5">{desc}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onTrigger}
          className={`text-[0.7rem] px-3 py-1.5 font-semibold rounded-full transition shrink-0 shadow-xs ${buttonClassName}`}
        >
          {buttonLabel}
        </button>
      </div>
      {result && (
        <div className="mt-3 p-3 bg-white rounded-xl border border-cream-200/50">
          <p className="text-xs text-charcoal-800 leading-relaxed font-serif">
            {prefix}{result}
          </p>
          {onCopy && (
            <div className="flex justify-end mt-2 pt-2 border-t border-cream-100">
              <button
                type="button"
                onClick={onCopy}
                className="text-[0.6rem] font-medium text-cyanic-600 hover:bg-cyanic-50 rounded-full px-2 py-0.5 border border-cyanic-100"
              >
                复制并去发送
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
