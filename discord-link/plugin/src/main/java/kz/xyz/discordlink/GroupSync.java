package kz.xyz.discordlink;

import net.luckperms.api.LuckPerms;
import net.luckperms.api.event.EventSubscription;
import net.luckperms.api.event.node.NodeMutateEvent;
import net.luckperms.api.model.user.User;
import net.luckperms.api.node.NodeType;
import net.luckperms.api.node.types.InheritanceNode;
import net.luckperms.api.query.QueryOptions;
import org.bukkit.Bukkit;
import org.bukkit.entity.Player;

import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

/**
 * Отправляет группы LuckPerms игрока боту. Ловит выдачу/снятие доната (NodeMutateEvent), вход игрока и
 * делает периодическую сверку (истёкший временный донат).
 */
public final class GroupSync {

    private final DiscordLinkPlugin plugin;
    private final LuckPerms lp;
    private final BotClient bot;
    private final Set<UUID> queued = ConcurrentHashMap.newKeySet();
    private EventSubscription<NodeMutateEvent> subscription;

    public GroupSync(DiscordLinkPlugin plugin, LuckPerms lp, BotClient bot) {
        this.plugin = plugin;
        this.lp = lp;
        this.bot = bot;
    }

    public void start() {
        subscription = lp.getEventBus().subscribe(plugin, NodeMutateEvent.class, e -> {
            if (e.isUser() && e.getTarget() instanceof User user) schedule(user.getUniqueId());
        });
        long period = Math.max(1, plugin.getConfig().getLong("resync-minutes", 10)) * 60 * 20;
        Bukkit.getScheduler().runTaskTimerAsynchronously(plugin, this::resyncOnline, period, period);
    }

    public void stop() {
        if (subscription != null) subscription.close();
    }

    public void resyncOnline() {
        for (Player p : Bukkit.getOnlinePlayers()) schedule(p.getUniqueId());
    }

    /** Склеивает серию изменений (выдали сразу несколько групп) в один запрос. */
    public void schedule(UUID uuid) {
        if (!queued.add(uuid)) return;
        Bukkit.getScheduler().runTaskLaterAsynchronously(plugin, () -> {
            queued.remove(uuid);
            push(uuid);
        }, 20L);
    }

    private void push(UUID uuid) {
        lp.getUserManager().loadUser(uuid).thenAccept(user -> {
            String name = user.getUsername() != null ? user.getUsername() : Bukkit.getOfflinePlayer(uuid).getName();
            if (name == null) return;
            bot.sync(uuid.toString(), name, groupsOf(user)).whenComplete((res, err) -> {
                if (err != null) plugin.getLogger().warning("Бот недоступен: " + err.getMessage());
                else if (!res.ok() && res.status() != 404) plugin.getLogger().warning("sync " + name + ": HTTP " + res.status() + " " + res.error());
            });
        });
    }

    private List<String> groupsOf(User user) {
        if (plugin.getConfig().getBoolean("include-inherited", false)) {
            return user.getInheritedGroups(QueryOptions.nonContextual()).stream()
                    .map(g -> g.getName().toLowerCase(Locale.ROOT)).distinct().toList();
        }
        // Только активные (не истёкшие) группы, выданные игроку напрямую
        return user.getNodes(NodeType.INHERITANCE).stream()
                .filter(n -> !n.hasExpired())
                .map(InheritanceNode::getGroupName)
                .map(s -> s.toLowerCase(Locale.ROOT))
                .distinct()
                .collect(Collectors.toList());
    }
}
