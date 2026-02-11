# Packet Tracer — Connect the Physical Layer (готовый разбор)

Я не могу физически собрать и отправить `.pkt` из этой среды (здесь нет Cisco Packet Tracer GUI),
но сделал полный разбор с ответами и точной последовательностью, чтобы ты за 5–10 минут собрал и получил 100%.

## Part 1. Identify Physical Characteristics

### Step 1 — Management ports (East router)
**Ответ:** доступны порты **Console** и **AUX** (на некоторых моделях ещё есть USB console).

### Step 2 — LAN/WAN interfaces (East router)

Команда:
```bash
show ip interface brief
```

- **LAN:** `GigabitEthernet0/0`, `GigabitEthernet0/1`
- **WAN:** `Serial0/0/0`, `Serial0/0/1`
- `Vlan1` — виртуальный интерфейс (не физический)

**Сколько физических интерфейсов:** **4**.

Проверка bandwidth:
```bash
show interface gigabitethernet 0/0
show interface serial 0/0/0
```

- Default BW для `G0/0`: **1000000 Kbit**
- Default BW для `S0/0/0`: **1544 Kbit**

### Step 3 — Expansion slots

- На **East** доступно **2** слота расширения.
- На **Switch2** доступно **2** слота расширения.

---

## Part 2. Select Correct Modules

### Step 1a — Модуль для подключения PC1, PC2, PC3 к East

**Нужный модуль:** `HWIC-4ESW` (4-port EtherSwitch).

**Сколько хостов можно подключить:** до **4** Ethernet-хостов.

### Step 1b — Модуль для Gigabit optical до Switch3

**Нужный модуль для Switch2:** `NM-1FGE` (1-port Gigabit Ethernet Fiber).

### Step 2 — Вставка модулей

1. Открываешь **Physical**.
2. Выключаешь питание устройства (кнопка справа от логотипа Cisco).
3. Перетаскиваешь модуль в пустой слот.
4. Включаешь питание обратно.

Проверка на Switch2:
```bash
show ip interface brief
```

**Слот модуля (по интерфейсу):** если появился `GigabitEthernet5/1`, значит модуль в **slot 5**.

---

## Part 3. Connect Devices (по таблице)

Подключения из задания (что видно в листе):

1. `East G0/0` —(Copper Straight-Through)— `Switch1 G0/1`
2. `East G0/1` —(Copper Straight-Through)— `Switch4 G0/1`
3. `East F0/1/0` —(Copper Straight-Through)— `PC1 F0`
4. `East F0/1/1` —(Copper Straight-Through)— `PC2 F0`
5. `East F0/1/2` —(Copper Straight-Through)— `PC3 F0`
6. `Switch1 F0/1` —(Copper Straight-Through)— `PC4 F0`
7. `Switch1 F0/2` —(Copper Straight-Through)— `PC5 F0`
8. `Switch1 F0/3` —(Copper Straight-Through)— `PC6 F0`
9. `Switch4 G0/2` —(Copper Cross-Over)— `Switch3 G3/1`
10. `Switch3 G5/1` —(Fiber)— `Switch2 G5/1`
11. `Switch2 F0/1` —(Copper Straight-Through)— `PC7 F0`
12. `Switch2 F1/1` —(Copper Straight-Through)— `PC8 F0`
13. `Switch2 F2/1` —(Copper Straight-Through)— `PC9 F0`
14. `Switch2 G3/1` —(Copper Straight-Through)— `AccessPoint Port0`

> Если в твоём `.pka` есть ещё 1–2 строки снизу таблицы (на скрине обрезано), ориентируйся строго на встроенный `Instructions -> Check Results`.

---

## Part 4. Check Connectivity

### 1) Проверка East
```bash
show ip interface brief
```
Ожидаемо:
- `G0/0` up/up, IP `172.30.1.1`
- `G0/1` up/up, IP `172.31.1.1`
- `S0/0/0` up/up, IP `10.10.10.1`
- `S0/0/1` down/down (если линк не задействован)
- `F0/1/0`, `F0/1/1`, `F0/1/2` up/up
- `F0/1/3` может быть down/down (если не подключён)
- `Vlan1` up/up, IP `172.29.1.1`

### 2) Wireless clients

- Laptop: `Config -> Wireless0 -> Port Status On`
- Проверка: в браузере открыть `www.cisco.srv`
- TabletPC: включить `Wireless0` и проверить доступ

### 3) TabletPC через 3G/4G

- На TabletPC выключить `Wireless0`
- Включить `3G/4G Cell1`
- Снова проверить web-доступ

### 4) Проверка остальных PC

- `ping` между ПК и к веб-серверу из задания.

---

## Быстрый чек-лист на 100%

- [ ] Вставлены правильные модули (`HWIC-4ESW` и `NM-1FGE`)
- [ ] Устройства были выключены перед установкой модулей
- [ ] Кабели выбраны ровно по таблице (особенно Cross-Over и Fiber)
- [ ] Все нужные интерфейсы в `up/up`
- [ ] Laptop и TabletPC проходят web-проверку
- [ ] TabletPC отдельно проверен через 3G/4G

---

Если хочешь, я могу следующим сообщением дать **супер-короткий “клик-по-клику” сценарий** (буквально: куда нажать 1,2,3...) чтобы ты без чтения теории сразу собрал `.pkt`.
