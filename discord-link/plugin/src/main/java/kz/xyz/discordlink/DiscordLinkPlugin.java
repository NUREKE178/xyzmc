package kz.xyz.discordlink;

import net.kyori.adventure.text.minimessage.MiniMessage;
import net.luckperms.api.LuckPerms;
import org.bukkit.Bukkit;
import org.bukkit.command.CommandSender;
import org.bukkit.command.PluginCommand;
import org.bukkit.event.EventHandler;
import org.bukkit.event.Listener;
import org.bukkit.event.player.PlayerJoinEvent;
import org.bukkit.plugin.RegisteredServiceProvider;
import org.bukkit.plugin.java.JavaPlugin;

public final class DiscordLinkPlugin extends JavaPlugin implements Listener {

    private static final MiniMessage MM = MiniMessage.miniMessage();

    private BotClient bot;
    private GroupSync groupSync;
    private CodeCapture capture;

    @Override
    public void onEnable() {
        saveDefaultConfig();

        RegisteredServiceProvider<LuckPerms> provider = Bukkit.getServicesManager().getRegistration(LuckPerms.class);
        if (provider == null) {
            getLogger().severe("LuckPerms не найден — плагин выключен.");
            getServer().getPluginManager().disablePlugin(this);
            return;
        }

        bot = new BotClient(getConfig().getString("api-url", ""), getConfig().getString("api-secret", ""));
        warnIfDefaultSecret();

        capture = new CodeCapture(this);
        groupSync = new GroupSync(this, provider.getProvider(), bot);
        groupSync.start();

        getServer().getPluginManager().registerEvents(capture, this);
        getServer().getPluginManager().registerEvents(this, this);

        DiscordCommand command = new DiscordCommand(this);
        PluginCommand pc = getCommand("discord");
        if (pc != null) {
            pc.setExecutor(command);
            pc.setTabCompleter(command);
        }
    }

    @Override
    public void onDisable() {
        if (groupSync != null) groupSync.stop();
    }

    /** Игрок зашёл — отправляем его группы (бот игнорирует непривязанных). */
    @EventHandler
    public void onJoin(PlayerJoinEvent event) {
        groupSync.schedule(event.getPlayer().getUniqueId());
    }

    public void reload() {
        reloadConfig();
        bot.configure(getConfig().getString("api-url", ""), getConfig().getString("api-secret", ""));
        warnIfDefaultSecret();
    }

    private void warnIfDefaultSecret() {
        String secret = getConfig().getString("api-secret", "");
        if (secret.length() < 16 || secret.startsWith("change-me")) {
            getLogger().warning("Задайте api-secret в config.yml (тот же, что API_SECRET у бота).");
        }
    }

    public void send(CommandSender to, String key) {
        String prefix = getConfig().getString("messages.prefix", "");
        String text = getConfig().getString("messages." + key, key);
        to.sendMessage(MM.deserialize(prefix + text));
    }

    public BotClient bot() {
        return bot;
    }

    public GroupSync groupSync() {
        return groupSync;
    }

    public CodeCapture capture() {
        return capture;
    }
}
