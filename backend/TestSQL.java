import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.Statement;

public class TestSQL {
    public static void main(String[] args) {
        String url = "jdbc:postgresql://localhost:5432/SentinelScan";
        String user = "sentinel";
        String password = "sentinel";

        try (Connection conn = DriverManager.getConnection(url, user, password);
             Statement stmt = conn.createStatement()) {

            int rows = stmt.executeUpdate("DELETE FROM scan_job WHERE status = 'FAILED';");
            System.out.println("Deleted " + rows + " failed scan jobs.");

        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
