"""
GROUP-89 流出防止 hook 共通：流出 keyword regex 定義。

「開発者間のやり取り・指示の引用」性質の表現を構造的に検出する。
false positive を最小化するため、明確な flag のみを対象（受ける / 影響 / 依頼 等の
一般技術用語は除外）。

bypass：環境変数 BORGESTAG_LEAK_BYPASS=1（auditable、commit / log に痕跡が残る）。
"""
import re

LEAK_PATTERNS = [
    # ユーザー（=project owner）からの会話・指示の引用パターン
    (re.compile(r"ユーザー(?:要望|報告|指摘|指示|フィードバック|fb|ご指示|ご要望|ご相談)"), "ユーザー XX 引用"),
    # 過去 Q 引用（Q-XX-N=z 形式 / Q-ux-N 要件 形式）
    (re.compile(r"Q-[a-zA-Z0-9]+(?:-[a-zA-Z0-9]+)+=[a-zA-Z0-9]+"), "Q 過去回答引用"),
    (re.compile(r"Q-ux-[a-zA-Z0-9]+\s*(?:要件|本来要件)"), "Q-ux 過去要件引用"),
    # 内部派生記号
    (re.compile(r"\bhznhv\d*\b"), "hznhv 内部記号"),
    (re.compile(r"GROUP-\d+-(?:grid-resizable|grid-margin|mvdl|merge|carryover-move|perf-[A-Za-z]+|tlsbl\d+|impl-[A-Za-z0-9-]+|hotfix|cleanup|slice(?:-\d+)?|skip|unzip|split)"), "GROUP-N-XXX 内部記号"),
    # 経緯・背景・対話 marker
    (re.compile(r"(?:^|[\s（(])経緯[:：]"), "経緯 marker"),
    (re.compile(r"(?:^|[\s（(])背景[:：]"), "背景 marker"),
    (re.compile(r"(?:^|[\s（(])相談[:：]?\s*\S"), "相談"),
    (re.compile(r"(?:^|[\s（(])議論[:：]?\s*\S"), "議論"),
    (re.compile(r"リテイク"), "リテイク"),
    (re.compile(r"やり直し"), "やり直し"),
    (re.compile(r"打ち合わせ"), "打ち合わせ"),
    (re.compile(r"ヒアリング"), "ヒアリング"),
    # 「ユーザーは〜」「ユーザーから〜」（end-user UX 説明と区別するため、と組合せ）
    (re.compile(r"ユーザー\s*[はがから]\s*[^。\n]{0,30}(?:報告|指摘|指示|要望|相談|質問|フィードバック|お願い|教え|確認)"), "ユーザー主語の会話"),
]


def scan_text(text):
    """text を全 LEAK_PATTERNS で走査し、ヒットを (label, match, pos) のリストで返す。"""
    hits = []
    for pat, label in LEAK_PATTERNS:
        for m in pat.finditer(text):
            hits.append((label, m.group(0), m.start()))
    return hits
