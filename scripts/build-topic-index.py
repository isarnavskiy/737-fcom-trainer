"""Build the offline topic atlas from the two Russian FCOM PDFs.

Usage: python scripts/build-topic-index.py path/to/pdfs [--output fcom-index.js]
Requires PyMuPDF. Physical pages are 1-based. Original bookmark positions form
stable IDs. Part numbers and outline structure are checked before writing.
"""
import argparse
import hashlib
import json
import re
import unicodedata
from collections import Counter, defaultdict
from pathlib import Path

import fitz


# Notes use original bookmark ordinals. A new revision must be reviewed before
# those notes can be attached to a changed outline.
OUTLINE_DIGESTS = {
    1: "be8400704a838fb3c0bac0a13a29ea0fd269a54f541f7b4e3788ce47d1884463",
    2: "b7d6a90fc97c36598240bd2529d899f2c709bffb38729ea757354715c1aeffec",
}

CONTENTS = {"содержание", "оглавление", "раздел «оглавление»"}
SENSITIVE = re.compile(r"двер[ьи] (?:в )?кабин|доступ[а-я]* в кабин|видеонаблюден|flight deck (?:access|door)|FLT DK DOOR|парол|код[а-я ]*доступ|охранн[а-я ]+сигнализац|emerg(?:ency)? access|код[а-я]* (?:для )?доступ|аварийн[а-я ]+доступ", re.I)
GENERIC = {"введение", "общие положения", "пояснения", "обзор", "описание системы", "справочная информация"}
RUSSIAN = re.compile(r"[А-Яа-яЁё]")


def compact(value):
    return " ".join(unicodedata.normalize("NFC", value).split())


def clean_title(title):
    return re.sub(r"^\d{1,2}(?:\s*[-.]\s*|\s+)(?=\D)", "", title)


def norm(text):
    return "".join(re.findall(r"[а-яa-z0-9]", text.lower().replace("ё", "е")))


def extract_pages(document):
    pages = {}
    for number, page in enumerate(document, 1):
        lines = []
        labels = []
        for block in page.get_text("dict", flags=fitz.TEXTFLAGS_TEXT)["blocks"]:
            for line in block.get("lines", []):
                spans = line["spans"]
                # The translation is a separate Liberation Serif layer laid over
                # the English manual. Mixing both layers destroys reading order.
                local = [span for span in spans if span["font"].startswith("Liberation")]
                if local:
                    x, y = (min(s["bbox"][i] for s in local) for i in (0, 1))
                    right, bottom = (max(s["bbox"][i] for s in local) for i in (2, 3))
                    text = compact(" ".join(s["text"].strip() for s in local))
                    if text:
                        lines.append((x, y, right, bottom, local[0]["size"], int("Bold" in local[0]["font"]), text))
                elif 45 <= line["bbox"][1] < 581 and len(labels) < 350:
                    text = compact(" ".join(s["text"].strip() for s in spans))
                    if (text in {"IRS","V1(MCG)","APU","MAP","PFD/ND"} and
                            "Bold" in spans[0]["font"] and spans[0]["size"]>=11.5 and line["bbox"][0]<=46):
                        x,y,right,bottom=line["bbox"]
                        lines.append((x,y,right,bottom,spans[0]["size"],1,text))
                    if len(text) < 111 and re.search("[A-Za-z]{2}", text):
                        labels.append(text)
        pages[number] = (sorted(lines, key=lambda row: (row[1], row[0])), labels)
    return pages


def page_rows(lines):
    return [r for r in lines if 43 < r[1] < 580 and
            not (r[0] > 200 and re.match(r"^(?:Глава|Раздел)\s+", r[6]))]


def find_anchor(title, rows, after=0):
    target = norm(clean_title(title))
    candidates = []
    for i, row in enumerate(rows):
        if i < after or not row[5]:
            continue
        combined = ""
        for last in range(i, min(i + 5, len(rows))):
            r = rows[last]
            if not r[5] or (last > i and (r[1] - rows[last-1][1] > 21 or
                                            abs(r[0] - row[0]) > 14 or abs(r[4] - row[4]) > 1)):
                break
            combined += norm(clean_title(r[6]) if last==i and re.match(r"^\d{1,2}\.\s", r[6]) else r[6])
            if combined == target:
                return i, last + 1
            if len(target) > 8 and combined.startswith(target) and len(combined) - len(target) < 12:
                candidates.append((len(combined)-len(target), i, last+1))
    if candidates:
        _, first, last = min(candidates)
        return first, last
    return None


def safe_text(text):
    return bool(text) and not (SENSITIVE.search(text) or re.search(
        r"\.{3}|(?:\.\s+){3}|\.{2}\s|#{1,}|\bRA[- ]\d{4,}|Примечание\s*[:.]|"
        r"Предупреждение\s*[:.]|ВНИМАНИЕ\s*[:.]|специально оставлена пустой|"
        r"преднамеренно оставлена|намеренно оставлен[а-я ]+пуст|\(Изменения по SB|^\d+\s*[).]|©", text, re.I))


def overlap(a, b):
    words = lambda s: {re.sub(r"(ого|его|ыми|ими|ами|ях|ую|ый|ой|ые|ах|ие|ая|яя|ов|ом|ем|а|ы|е|и|я)$", "", x)
                       for x in re.findall(r"[а-яa-z]{4,}", s.lower().replace("ё", "е"))}
    return len(words(a) & words(b))


def independent(sentence):
    if not (32 <= len(sentence) <= 380 and safe_text(sentence) and RUSSIAN.search(sentence)):
        return False
    if not re.match(r'^[«(]?[А-ЯЁA-Z]', sentence) or not re.search(r'[.!?][»)]?$', sentence):
        return False
    return not re.search(
        r"^(?:Они|Он[аои]?|При этом|В этом случае|При необходимости|Следовательно|"
        r"Например|На рисунке (?:ниже|выше)|См\.|Продолжение|Показан[аоы]? ниже|"
        r"Для этого|Этот же|Оба эти|Это (?:также|позволяет|приводит)|Затем|После этого|"
        r"Таким образом|Иначе|В противном случае|Однако|Вторая|Первый из|Данный пример|"
        r"См\. также|Далее|В примере|При указанн|При приведенн|Оставшиеся|"
        r"Если да|Если нет|Нажать (?:е[её]|эту)|Убедиться, что (?:он|она|они)\b)",sentence,re.I)


def sentences(rows):
    """Only join lines with the same font role, indentation and baseline spacing."""
    group = []
    for index, row in enumerate([*rows, None]):
        if row is None or (group and (
            row[1] - group[-1][1] > max(16.5, group[-1][4] * 1.45) or
            row[1] - group[-1][1] < 3 or
            abs(row[0] - group[-1][0]) > 7 or
            row[5] != group[-1][5] or abs(row[4] - group[-1][4]) > 1 or
            not safe_text(group[-1][6]) or not safe_text(row[6])
        )):
            merged = compact(" ".join(r[6] for r in group))
            # All quotes are contiguous source strings apart from line wrapping.
            for sentence in re.split(r'(?<=[.!?])\s+(?=[«(]?[А-ЯЁA-Z])', merged):
                if independent(sentence):
                    yield sentence, index - len(group)
            group = []
        if row is not None:
            group.append(row)


def heading_names(rows):
    result = []
    i = 0
    while i < len(rows):
        r = rows[i]
        if r[5] and r[4] >= 8.5:
            parts = [r[6]]
            while i+1 < len(rows):
                following = rows[i+1]
                if not (following[5] and abs(following[0]-r[0])<4 and abs(following[4]-r[4])<0.5 and
                        5 < following[1]-rows[i][1] < min(r[4]*1.35, 16)):
                    break
                i += 1
                parts.append(following[6])
            candidate = compact(" ".join(parts))
            if (3 <= len(candidate) <= 115 and RUSSIAN.search(candidate) and safe_text(candidate)
                    and not re.search(r"^(?:Глава |Раздел |Примечание|Внимание|Предупреждение|СПРАВОЧНАЯ ИНФОРМАЦИЯ|ПРИМЕЧАНИЕ|ВНИМАНИЕ|Оглавление|Информация для)",candidate,re.I)
                    and not re.search(r"[.!?:;–—-]$",candidate) and candidate not in result):
                result.append(candidate)
        i += 1
    return result


# Reading concepts for recurring performance charts. Conditions such as gear,
# engine configuration, rating and package are retained in the outline, rather
# than transferring a numerical example from one configuration into another.
PERFORMANCE = [
    ("Идентификация пакета", "Обозначение пакета связывает расчётные данные с вариантом самолёта и двигателя. Единицы, конфигурация и сертификационная основа указаны в названии пакета."),
    ("Поправки к длине ВПП|поправки на уклон и ветер", "Уклон и продольная составляющая ветра влияют на располагаемую длину полосы, используемую при определении ограниченной взлётной массы."),
    ("[Вв]злётная масса по длине|Масса, ограниченная длиной ВПП и набором", "Ограничение по длине полосы и ограничение по набору высоты рассматриваются раздельно. Определяющим может оказаться любое из них."),
    ("ограниченная препятствиями", "Допустимая масса зависит от траектории набора относительно препятствия. Значение связано с высотой препятствия и его удалением."),
    ("скорост[ьи] пневматиков", "Допустимую взлётную массу может ограничивать предельная путевая скорость колёс. Это отдельная проверка от ограничения по длине полосы."),
    ("энергоёмкости тормозов", "VMBE связана с количеством энергии, которое тормоза могут поглотить при прекращённом взлёте. Проверка относится к соответствующему пакету характеристик."),
    ("Максимальная высота", "Для заданной массы определяется верхняя граница высоты в режиме максимальной дальности. Таблица связывает эту границу с указанными атмосферными условиями."),
    ("Достижимая высота", "Показана высота, достижимая при данной массе и конфигурации в режиме максимальной дальности. Выпущенное шасси или отказ двигателя учитываются согласно заголовку раздела."),
    ("ступенчат", "Ступенчатый набор меняет высоту крейсерского полёта по мере уменьшения массы. Данные связывают план высот с расходом топлива и временем полёта."),
    ("Рейсовое топливо и время для коротких", "На коротком маршруте набор и снижение составляют заметную часть полёта. Для него приведена отдельная зависимость между дальностью, временем и рейсовым топливом."),
    ("(?:Рейсовое топливо и время|Топливо и время на маршруте)", "Рейсовое топливо и время определяются для полёта в указанном режиме. Полоса высот и конфигурация самолёта задают область применения данных."),
    ("ожидани", "Продолжительность ожидания связана с располагаемым топливом, массой самолёта и высотой. Для различных конфигураций предусмотрены отдельные данные."),
    ("кислородной систем", "Сопоставляются потребность в кислороде и условия полёта при разгерметизации. В названии указаны категория людей и тип кислородной системы."),
    ("чистой траектории", "Рассматривается масса, при которой в заданных условиях возможен горизонтальный участок чистой траектории (net flight path)."),
    ("Посадочная масса, ограниченная длиной", "Допустимая посадочная масса по длине полосы связана с располагаемой дистанцией и состоянием покрытия. Условия полосы берутся из соответствующего раздела."),
    ("Посадочная масса, ограниченная набором|Взлётная/посадочная масса, ограниченная набором|Взлётная масса, ограниченная набором", "При проверке массы по набору определяющим является требуемый градиент в указанной конфигурации. Температура и высота по давлению влияют на располагаемые характеристики."),
    ("Градиент набора", "Градиент описывает прирост высоты на единицу пройденного горизонтального расстояния. Здесь рассматривается набор при уходе на второй круг."),
    ("быстрого оборота", "Раздел связывает посадочную массу с ограничениями по нагреву тормозов перед следующим вылетом. Данные выбираются для установленного типа тормозов."),
    ("Взлётные скорости|Поправка к взлётным скоростям", "Здесь рассматриваются опорные скорости взлёта и связанные с ними поправки. Применимость определяется состоянием полосы, конфигурацией закрылков и номиналом тяги в заголовке."),
    ("триммер[а]? стабилизатора", "Табличная установка взлётного триммера стабилизатора связана с центровкой самолёта. Выбор исходной таблицы зависит от конфигурации."),
    ("VREF", "VREF — опорная скорость посадки. Данные приводятся по положениям закрылков и массе самолёта."),
    ("Маневренные скорости", "Показана связь между положением закрылков, массой самолёта и соответствующей маневренной скоростью."),
    ("слякотью|скользкой ВПП", "Состояние поверхности ВПП влияет на разбег и на возможность остановиться при прекращённом взлёте. Поправки относятся к указанному типу покрытия и конфигурации самолёта."),
    ("принятой температуре", "Метод принятой температуры связывает расчётную температуру с уменьшением взлётной тяги. Данные разделены по исходному номиналу двигателя."),
    ("%N1|% N1", "N1 показывает частоту вращения ротора низкого давления в процентах. Здесь приведены значения для конкретного режима тяги, указанного в названии."),
    ("недостоверной скорости|пролёт зоны турбулентности", "Заданные сочетания тангажа и тяги относятся к приведённым условиям полёта. Высота и конфигурация определяют выбор данных."),
    ("Параметры режима максимальной дальности", "Параметры крейсерского режима максимальной дальности (LRC) представлены для разных масс и высот. Режим работы двигателей и положение шасси определяются разделом."),
    ("Выбор высоты с учётом ветра", "Сравнивается эффект ветра на разных высотах при полёте в режиме максимальной дальности. Экономия по дальности зависит также от изменения ветра между эшелонами."),
    ("^Снижение$", "Снижение описывается через изменение высоты, затраты времени и пройденное расстояние. Состояние двигателей и шасси устанавливают по ветви оглавления."),
    ("Посадочная дистанция", "Дистанция посадки рассматривается для конкретной конфигурации. Исходные значения и поправки читаются вместе с условиями полосы и применимости в заголовках таблицы."),
    ("охлаждения тормозов", "График связывает энергию торможения с последующим охлаждением тормозов. При чтении учитываются условия, для которых построен график."),
    ("Скорость снижения на одном", "Приведены данные для снижения при одном неработающем двигателе и последующего выхода на высоту горизонтального полёта."),
    ("Дальность при снижении", "Рассматривается дальность снижения при одном неработающем двигателе с последующим полётом в режиме максимальной дальности."),
    ("Топливо и время ухода на запасной", "Данные связывают дальность до запасного аэродрома с запасом топлива и временем при указанном состоянии двигателей."),
    ("Располагаемая вертикальная скорость", "Рассматривается располагаемая вертикальная скорость на посадочном этапе с выпущенным шасси. Конфигурация закрылков и масса относятся к условиям таблицы."),
    ("V1\\(MCG\\)", "Эта таблица связывает минимальное значение V1 с ограничением по управляемости на земле при взлёте."),
    ("антиюза не работает", "Приведены поправки для случая, когда противоюзовая защита недоступна. Такая конфигурация имеет собственные условия определения характеристик."),
    ("Реверс тяги не работает", "При недоступном реверсе изменяется составляющая торможения, связанная с тягой двигателей. Раздел содержит данные именно для этой конфигурации."),
    ("Работа APU в полёте", "Работа вспомогательной силовой установки в полёте учитывается отдельно при оценке характеристик и расхода топлива."),
    ("Предельная масса", "Предельная масса здесь относится к резервному режиму электронного управления двигателем (EEC). Данные связаны с номиналом тяги и условиями конкретного пакета."),
    ("Резервный режим EEC", "В резервном режиме электронного управления двигателем применяются отдельные данные по характеристикам и тяге."),
    ("С выпущенным шасси", "Выпущенное шасси увеличивает сопротивление, поэтому для этой конфигурации приведены собственные лётные характеристики."),
    ("С неработающим двигателем", "Потеря тяги одного двигателя меняет доступную высоту и параметры полёта. Эта ветвь объединяет данные для соответствующей конфигурации."),
    ("Все двигатели работают", "Здесь собраны данные для полёта с обоими работающими двигателями, включая крейсерский режим и ожидание."),
]

# The translated PDF retains a few headings in the English layer. All other
# aliases below were checked against the printed heading on that physical page.
PRINTED_HEADINGS = {
    (1,3): "Ограничения и эксплуатационная информация",
    (2,59): "Описание систем",
    (2,517): "Навигационные индикаторы – Сигнализация и сообщения. Индикация несоответствия режима и частоты",
    (2,1071): "Табло взлётной конфигурации и высоты в кабине",
    (2,1113): "Двухпозиционная хвостовая опора",
}


def quoted(items, max_items=4):
    return ", ".join("«" + title.strip("«»") + "»" for title in items[:max_items])


def chart_concept(title):
    for pattern, explanation in PERFORMANCE:
        if re.search(pattern, title, re.I):
            return explanation
    return ""


def empty_print_page(raw):
    rows, labels = raw
    translated = [r[6] for r in page_rows(rows) if safe_text(r[6])]
    artwork = [t for t in labels if not re.search(r"Boeing|EAR|Copyright|intentionally blank|^RA[- ]|File Highlight|flight crew operations manual|^D6-|^\w+ \d+, 20\d\d", t,re.I)]
    return not translated and not artwork


def read_volume(doc, number, pages):
    rows = {p:page_rows(value[0]) for p,value in pages.items()}
    outline = doc.get_toc()
    assert all(1 <= entry[2] <= len(doc) for entry in outline)
    assert all(a[2] <= b[2] for a,b in zip(outline,outline[1:]))
    items = []
    stack = []
    last_anchor = defaultdict(int)
    for index, (depth, title, page) in enumerate(outline, 1):
        entry = dict(id=f"v{number}-{index:04d}", volume=number, depth=depth,
                     parent=None, title=title, page=page)
        while stack and stack[-1]["depth"] >= depth:
            stack.pop()
        if stack:
            entry["parent"] = stack[-1]["id"]
        translated = PRINTED_HEADINGS.get((number,index), title)
        anchor = find_anchor(translated, rows[page], last_anchor[page])
        if anchor is not None:
            last_anchor[page] = anchor[1]
        entry.update(anchor=anchor, children=[], context=[other["title"] for other in stack])
        if stack and title.casefold() not in CONTENTS:
            stack[-1]["children"].append(title)
        stack.append(entry)
        items.append(entry)

    def end_before(next_item):
        if next_item is None:
            return len(doc)
        p, anchor = next_item["page"], next_item["anchor"]
        text_above = rows[p][:anchor[0]] if anchor else []
        # A mid-page heading shares its page with the preceding topic. Only
        # count substantive text above it, not a chapter banner or repeated label.
        shared = anchor and (rows[p][anchor[0]][1] > 170 or (rows[p][anchor[0]][1] > 105 and any(
            safe_text(r[6]) and (not r[5] or r[1] >= 90) for r in text_above)))
        return p if shared else max(1,p-1)

    for index, item in enumerate(items):
        if item["title"].casefold() in CONTENTS:
            continue
        after = index+1
        while after<len(items) and items[after]["depth"]>item["depth"]:
            after+=1
        boundary = items[after] if after<len(items) else None
        end = max(item["page"], end_before(boundary))
        while end>item["page"] and empty_print_page(pages[end]):
            end -= 1
        # A child bookmark is part of its parent even if several chapter banners
        # or diagram-only pages have almost no translated text.
        if after>index+1:
            end=max(end,items[after-1]["page"])
        item["end"]=end
        direct_end = items[index+1] if index+1 < len(items) else None
        segments = []
        start = item["page"]
        anchor = item["anchor"]
        stop = min(end, end_before(direct_end),start+4)
        if direct_end and direct_end["page"] == start:
            stop = start
        for p in range(start,stop+1):
            fragment = rows[p]
            first = anchor[1] if p==start and anchor else 0
            last = direct_end["anchor"][0] if direct_end and p==direct_end["page"] and direct_end["anchor"] else len(fragment)
            # Two consecutive outline entries can genuinely share a heading.
            if direct_end and p==direct_end["page"] and not direct_end["anchor"]:
                last=0
            segments.append((p,fragment[first:last]))
        apply_content(item,segments,number,index+1)
    return [{k:v for k,v in item.items() if k not in {"anchor","children","context"}}
            for item in items if item["title"].casefold() not in CONTENTS]


def apply_content(item,segments,volume,index):
    title = clean_title(item["title"])
    path = item["context"]
    children = item["children"]
    if SENSITIVE.search(title) or any(SENSITIVE.search(t) for t in path):
        item.update(kind="scope", description="Тема относится к защите кабины экипажа и разграничению доступа. В учебном обзоре она отмечена как отдельная система авиационной безопасности.")
        return
    chart = volume == 1 and index>=305
    in_explanations = any(x in {"Пояснения"} for x in path)
    concept = chart_concept(title) if chart else ""
    headings = []
    excerpts = []
    for p, fragment in segments:
        for h in heading_names(fragment):
            if norm(h) not in {norm(title),*(norm(x) for x in path)} and h not in headings:
                headings.append(h)
        for pos, (sentence, start_line) in enumerate(sentences(fragment)):
            if sentence not in [r[2] for r in excerpts]:
                # Prefer introductory definitions, then later text describing a
                # named control or quantity. Do not quote an isolated figure value.
                score = min(3,overlap(title,sentence))*3 + (p==item["page"])*3 - pos*.8
                if re.match(r"^(?:Убедиться|Нажать|Проверить|См |Установить|Ввести|Выбрать|Выполнить|Выключить|Потянуть|Удерживать|Установите)",sentence):
                    score -= 5
                if 60<=len(sentence)<=250:
                    score+=1
                if re.search(r"описан[а-ясё ]+в главе|в следующих примерах|показан[а-я ]+на следующ|см[.] раздел|см[.] главу|пример[а-я ]+ниже",sentence,re.I):
                    score -= 10
                excerpts.append((score,p,sentence,fragment,start_line))
    if children:
        described = [clean_title(c) for c in children if clean_title(c).casefold() not in GENERIC]
        if not described:
            described = [clean_title(c) for c in children]
        if title.startswith("Раздел 737-"):
            intro = "Пакет расчётных данных для конфигурации " + title.removeprefix("Раздел ") + "."
        else:
            intro = concept
        section = "Внутри раздела " + quoted(described) + (" и другие темы." if len(described)>4 else ".")
        item.update(kind="section",description=(intro+" "+section).strip())
    elif chart and concept:
        item.update(kind="text" if in_explanations else "table",description=concept)
    elif headings:
        item.update(kind="text",description="На страницах темы выделены " + quoted(headings) + (" и другие элементы." if len(headings)>4 else "."))
    else:
        item.update(kind="text" if excerpts else "figure", description="")
    if excerpts and (not chart or in_explanations or not concept):
        _,p,sentence,fragment,start_line=max(excerpts,key=lambda s:s[0])
        item.update(excerpt=sentence,excerptPage=p)
        precise=heading_names(fragment[:start_line])
        if precise and norm(precise[-1])!=norm(title):
            item["excerptHeading"]=precise[-1]


# Brief reading notes for rows which consist of signatures, table columns or
# instrument legends instead of connected prose. Keys are original bookmark IDs.
READING_NOTES = {
    "v1-0022": ("text","В AFM отдельно оговорены ограничения HF-связи и допустимое использование ACARS. Для ACARS важны последствия задержки, утраты, искажения или ошибочной адресации сообщения."),
    "v1-0067": ("table","В таблице сопоставлены взлётное положение закрылков, показание скорости и следующее положение закрылков при уборке. Строка зависит от исходной конфигурации."),
    "v1-0071": ("table","Таблица связывает положение закрылков, отметку на шкале скорости, следующую конфигурацию и её целевую скорость. Для посадочной конфигурации отдельно указана поправка на ветер."),
    "v1-0142": ("table","Колонки PF и PM распределяют подготовку к заходу между пилотами. В брифинге учитываются ограничения маршрута и уход на второй круг, а при выборе навигационных источников — ограничения на коррекцию местоположения."),
    "v2-0031": ("text","MAP и CHART относятся к разным светильникам рабочего места. На рисунке каждому регулятору поставлена в соответствие его лампа."),
    "v2-0335": ("figure","На иллюстрации показано место надписи ENG FAIL среди параметров двигателя. Надпись относится к индикации отказа конкретного двигателя."),
    "v2-0348": ("figure","На одном пульте собраны выбор опорного значения N1, управление индикацией расхода топлива, селектор опорных скоростей и кнопки выбора отображаемых данных."),
    "v2-0395": ("text","Красные главные табло FIRE WARN привлекают внимание к пожарной сигнализации. Источник сигнала уточняется по соответствующим указателям системы."),
    "v2-0470": ("figure","Рисунок показывает взаимное положение внешних и внутренних индикаторов пилотов и центральных индикаторов. Это ориентир для чтения страниц по отдельным форматам индикации."),
    "v2-0532": ("figure","На схеме показано размещение индикаторов системы PFD/ND у обоих пилотов и в центре панели. Расположение индикатора и формат выводимых на него данных рассматриваются раздельно."),
    "v2-0496": ("figure","VSI обозначает указатель вертикальной скорости. Янтарный флажок на иллюстрации показывает вид индикации при его отказе."),
    "v2-0507": ("figure","В расширенном формате MAP карта показывает обстановку впереди самолёта. На схеме отдельно обозначены путевой угол, скорость и расстояние до следующей активной точки."),
    "v2-0508": ("figure","В центрированном формате MAP символ самолёта располагается в центре карты. На схеме подписаны путевой угол и данные следующей активной точки."),
    "v2-0510": ("figure","На схеме расширенного формата захода выделены источник ILS, дальность DME и отклонение от курсового маяка. Эти обозначения помогают соотнести положение самолёта с выбранной линией курса."),
    "v2-0511": ("figure","Раздел показывает компоновку центрированного режима захода. Вокруг центрального символа самолёта размещаются курс, шкала отклонения и данные опорного приёмника ILS."),
    "v2-0513": ("figure","В расширенном формате VOR показаны выбранная линия курса, боковое отклонение и данные опорного радиосредства. DME обозначает измеряемую дальность."),
    "v2-0514": ("figure","В центрированном формате VOR на рисунке подписаны шкала бокового отклонения и стрелка TO/FROM, указывающая направление относительно радиомаяка."),
    "v2-0545": ("figure","Радиовысота отображается в нижней части пилотажной индикации. На иллюстрациях сопоставлены цифровое представление и круговая шкала с выбранным минимумом."),
    "v2-0565": ("figure","Две компоновки MAP позволяют сравнить положение самолёта относительно карты. На схемах подписаны путевая и истинная воздушная скорость, курс и отражения метеолокатора."),
    "v2-0568": ("figure","Рядом показаны два формата индикации захода. Подписи выделяют курсовую информацию, индекс выбранного курса и вектор ветра."),
    "v2-0570": ("figure","На двух схемах VOR можно найти индекс выбранного курса, стрелку ветра и линию курса. Отличается размещение информации вокруг символа самолёта."),
    "v2-0595": ("text","Внешний селектор выбирает вид опорной скорости или режим AUTO. Внутренняя ручка служит для изменения выбранного значения. В AUTO источник данных — FMC."),
    "v2-0611": ("text","Пульт объединяет селектор вида опорных данных и внутреннюю ручку их установки. На рисунке обозначены положения для автоматического и ручного ввода."),
    "v2-1046": ("text","HYD BRAKE PRESS показывает давление в тормозном гидроаккумуляторе. Для чтения прибора важно отличать рабочее давление от давления предварительной зарядки."),
    "v2-1070": ("text","PSEU — электронный блок бесконтактных датчиков. Раздел описывает смысл его янтарного табло на земле и условия блокировки индикации в полёте."),
    "v2-1071": ("text","Два отдельных табло сигнализируют о взлётной конфигурации и высоте в кабине. На рисунке указано их положение на передних панелях обоих пилотов."),
}


# In these source pages an excerpt without its column heading or first line
# would be ambiguous. Preserve the learning point as an attributed reading
# note. The original page remains the reference for all operating conditions.
CONTEXT_NOTES = {
    "v1-0007": "Для сильной турбулентности AFM различает набор, снижение и крейсерский полёт. Приведённая на странице скорость относится к набору и снижению, для эшелона дана отдельная ссылка на дополнительную процедуру.",
    "v1-0019": "Ограничения AFM для автопилота зависят от этапа полёта, режима захода и числа работающих каналов. Ограничения ветра для автоматической посадки приведены отдельно по условиям и варианту самолёта.",
    "v1-0057": "Предполётная проверка второго пилота охватывает группы систем на панелях кабины. В начале последовательности рассматриваются приводы управления, их переключатели и ожидаемая индикация гидравлического давления.",
    "v1-0061": "Перед последовательностью запуска приведены ограничения рабочего цикла стартера. Время одной попытки и минимальный перерыв между последовательными попытками рассматриваются вместе.",
    "v1-0088": "Питьевая вода распределяется между баком, кухнями и туалетами. При изучении схемы слива важно различать линии в передней и задней частях самолёта и собственно бак.",
    "v1-0105": "Проверка сопоставляет выбранный ручной режим наддува с состоянием табло MANUAL, AUTO FAIL и ALTN. Далее рассматриваются движение выпускного клапана и его указатель.",
    "v1-0126": "В LVL CHG целевая скорость задаётся через IAS/MACH, а AFDS показывает режим тангажа MCP SPD. На странице отдельно указаны режимы тяги при наборе и снижении.",
    "v1-0127": "В режиме V/S задаётся вертикальная скорость. На FMA режим тангажа обозначается V/S, а выдерживание выбранной скорости отражается в колонке тяги как MCP SPD.",
    "v1-0139": "При предполётной подготовке к этому заходу оценивают прогноз доступности RNP. Прогноз относится к навигационным характеристикам, необходимым для планируемой процедуры.",
    "v1-0159": "Проверка связывает источники питания резервных шин, положения органов переключения и показания AC/DC. Табло STANDBY PWR OFF рассматривается в контексте конкретного этапа проверки.",
    "v1-0162": "Для этого варианта запуска сжатый воздух поступает от наземного источника, а электропитание переменного тока уже имеется. Раздел разграничивает источник воздуха и стандартную последовательность запуска двигателя.",
    "v1-0201": "На странице HOLD различаются команда выхода и состояние подготовленного выхода EXIT ARMED. Траектория возврата к точке ожидания связывает выход из схемы с дальнейшим ведением по LNAV.",
    "v1-0204": "На страницах навигационных данных FMC рассматривается сохранение созданной пользователем точки. Такое определение можно отличить от точки, уже содержащейся в опубликованной базе.",
    "v1-0205": "Тема относится к удалению пользовательского определения точки из навигационных данных. Это отдельная операция от изменения последовательности участков маршрута на RTE LEGS.",
    "v1-0213": "В этой процедуре рассматривается исключение информации VOR/DME из коррекции вычисленного местоположения FMC и последующее снятие ограничения.",
    "v1-0224": "Ограничения скорости и высоты для набора и снижения представлены на соответствующих страницах VNAV. Обе части ограничения нужно читать в контексте выбранного этапа полёта.",
    "v2-0130": "К генератору азота подводится воздух из пневмосистемы. Назначение системы в контексте топливного бака подробно рассматривается в главе 12 «Топливо».",
    "v2-0238": "Сообщения в окнах настройки различают неисправность самого пульта и связанного с ним оборудования. Раздел показывает, как выглядят обозначения PANEL FAIL и FAIL FAIL.",
    "v2-0392": "Описание относится к кнопке механической разблокировки пожарного выключателя двигателя. Иллюстрация помогает отличить разблокировку выключателя от сигнализации перегрева двигателя рядом на той же странице.",
    "v2-0424": "Проверка панели CARGO FIRE сопоставляет звуковой сигнал с индикацией FIRE WARN и табло противопожарной системы грузовых отсеков. Для каждого элемента перечислена ожидаемая реакция.",
    "v2-0599": "В этом варианте приборной панели показан ISFD. На одном резервном экране объединены пространственное положение, скорость и высота. Отдельно обозначены магнитный компас и резервный радиомагнитный индикатор.",
    "v2-0615": "На страницах показаны разные варианты комплектации. Авиагоризонт и прибор высоты и скорости могут быть отдельными, а при установке ISFD эти параметры собраны на одном резервном экране.",
    "v2-0645": "Раздел описывает назначение интегрированного резервного индикатора ISFD рядом с отдельными приборами курса и радиопеленга. Измеряемые величины помогают различать их роли на панели.",
    "v2-0658": "Примеры показывают, какие экранные блоки и пульты EFIS связаны друг с другом при разных положениях селекторов. Отправной точкой служит нормальное распределение между сторонами кабины.",
    "v2-0667": "Здесь сопоставляются возможности отдельных резервных приборов и интегрированного индикатора ISFD. В ту же группу входят магнитный компас и радиомагнитный индикатор, отвечающие за другую навигационную информацию.",
    "v2-0755": "В легенде ND раздельно приведены символы рельефа и препятствий. Цвет и обозначение сигнализации различают уровень предупреждения, а данные карты соотносятся с базой GPWS.",
    "v2-0827": "Термин «активный» в FMC обозначает данные плана полёта, которые уже используются для вычисления команд LNAV или VNAV. Он помогает отличить действующий план от подготовленного изменения.",
    "v2-0891": "В предполётной последовательности CDU некоторые страницы выбирают вручную. Такой переход прерывает автоматическую последовательность, а страницы DEPARTURES и ARRIVALS используются при работе с SID и STAR.",
    "v2-0989": "Таблица связывает сообщения канала передачи данных FMC с их причиной и ожидаемой проверкой экипажа. Среди примеров есть загруженные с земли запасные аэродромы и данные о ветре.",
    "v2-1037": "Показание количества гидрожидкости меняется при создании давления, движении шасси и механизации крыла, а также при длительном охлаждении в полёте. Отдельно описан случай вспенивания жидкости.",
    "v2-1065": "Сводная таблица показывает, какие системы по-разному работают на земле и в воздухе. Каждая строка относится к своей системе, а смысл её ячеек определяется колонками состояния самолёта.",
}


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument("folder",type=Path)
    parser.add_argument("--output",type=Path,default=Path(__file__).resolve().parents[1]/"fcom-index.js")
    args=parser.parse_args()
    volumes=[]
    topics=[]
    for volume in (1,2):
        matches=[p for p in args.folder.iterdir() if p.suffix.lower()==".pdf" and
                 (re.search(fr"часть\s*{volume}\b",p.stem,re.I) or p.stem==f"fcom-ru-part-{volume}")]
        if len(matches)!=1:
            parser.error(f"Expected exactly one PDF for part {volume} in {args.folder}, found {len(matches)}")
        with fitz.open(matches[0]) as pdf:
            outline=pdf.get_toc()
            outline_bytes = json.dumps(outline, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
            if hashlib.sha256(outline_bytes).hexdigest() != OUTLINE_DIGESTS[volume]:
                parser.error(f"The outline of {matches[0].name} differs from the edition used by the reading notes")
            volumes.append(dict(id=volume,title=f"737 FCOM RU · Часть {volume}",pages=len(pdf)))
            topics.extend(read_volume(pdf,volume,extract_pages(pdf)))
    # An authored caption also covers diagrams whose technical labels are
    # part of the drawing and cannot be extracted as Russian running text.
    illustration_notes = Path(__file__).with_name("illustration-notes.json")
    notes = {key:dict(kind=kind,description=description)
             for key,(kind,description) in READING_NOTES.items()}
    notes.update(json.loads(illustration_notes.read_text(encoding="utf-8")))
    known_ids = {t["id"] for t in topics}
    if not notes.keys() <= known_ids:
        raise ValueError("A reading note refers to an unknown original bookmark")
    for item in topics:
        note=notes.get(item["id"])
        if note and item["kind"]!="scope":
            item.update(note if isinstance(note,dict) else {"description":note})
        if item["id"] in CONTEXT_NOTES:
            item["description"] = CONTEXT_NOTES[item["id"]]
            for key in ("excerpt", "excerptPage", "excerptHeading"):
                item.pop(key, None)
        if not item["description"] and not item.get("excerpt"):
            raise ValueError(f"Missing source content or authored reading note for {item['id']}")
    data=dict(version=1,volumes=volumes,topics=topics)
    args.output.write_text("/* Generated by scripts/build-topic-index.py from the two FCOM PDFs. */\nwindow.FcomIndex="+
                           json.dumps(data,ensure_ascii=False,separators=(",",":"))+";\n",encoding="utf-8")
    print(f"{len(topics)} topics; {dict(Counter(r['kind'] for r in topics))}")


if __name__=="__main__":
    main()
